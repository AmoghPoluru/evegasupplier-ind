import type { Product, Supplier } from "@/payload-types";
import { validatedOnToInputValue } from "@/lib/product-validated-on";

export const PRODUCT_CSV_HEADERS = [
  "id",
  "title",
  "category",
  "unitPrice",
  "moq",
  "actualSupplierUrl",
  "validatedOn",
  "supplier",
] as const;

function supplierName(supplier: Product["supplier"]): string {
  if (!supplier) return "";
  if (typeof supplier === "string") return supplier;
  return (supplier as Supplier).companyName || "";
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function productsToCsv(products: Product[]): string {
  const lines = [PRODUCT_CSV_HEADERS.join(",")];
  for (const p of products) {
    const row = [
      p.id,
      p.title ?? "",
      p.category ?? "",
      p.unitPrice != null ? String(p.unitPrice) : "",
      p.moq != null ? String(p.moq) : "",
      p.actualSupplierUrl ?? "",
      validatedOnToInputValue(p.validatedOn),
      supplierName(p.supplier),
    ].map((c) => escapeCsvCell(String(c)));
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

/** Minimal CSV parser supporting quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    // skip trailing empty row
    if (row.length === 1 && row[0] === "" && rows.length > 0) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      pushCell();
      continue;
    }
    if (ch === "\n") {
      pushCell();
      pushRow();
      continue;
    }
    if (ch === "\r") {
      continue;
    }
    cell += ch;
  }
  pushCell();
  if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
    pushRow();
  }
  return rows;
}

export type CsvProductPatch = {
  id: string;
  title?: string;
  category?: string;
  unitPrice?: number | null;
  moq?: number | null;
  actualSupplierUrl?: string;
  validatedOn?: string | null;
};

export function csvRowsToProductPatches(rows: string[][]): {
  items: CsvProductPatch[];
  errors: string[];
} {
  const errors: string[] = [];
  if (rows.length < 2) {
    return { items: [], errors: ["CSV has no data rows"] };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name.toLowerCase());

  const idI = idx("id");
  if (idI < 0) {
    return { items: [], errors: ['Missing required column "id"'] };
  }

  const titleI = idx("title");
  const categoryI = idx("category");
  const unitPriceI = idx("unitprice");
  const moqI = idx("moq");
  const urlI = idx("actualsupplierurl");
  const validatedI = idx("validatedon");

  const items: CsvProductPatch[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const id = (cells[idI] ?? "").trim();
    if (!id) {
      errors.push(`Row ${r + 1}: missing id`);
      continue;
    }

    const patch: CsvProductPatch = { id };

    if (titleI >= 0) {
      const t = (cells[titleI] ?? "").trim();
      if (!t) {
        errors.push(`Row ${r + 1}: title cannot be empty`);
        continue;
      }
      patch.title = t;
    }
    if (categoryI >= 0) {
      patch.category = (cells[categoryI] ?? "").trim();
    }
    if (unitPriceI >= 0) {
      const raw = (cells[unitPriceI] ?? "").trim();
      if (raw === "") patch.unitPrice = null;
      else {
        const n = Number(raw);
        if (Number.isNaN(n) || n < 0) {
          errors.push(`Row ${r + 1}: invalid unitPrice`);
          continue;
        }
        patch.unitPrice = n;
      }
    }
    if (moqI >= 0) {
      const raw = (cells[moqI] ?? "").trim();
      if (raw === "") patch.moq = null;
      else {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0) {
          errors.push(`Row ${r + 1}: invalid moq`);
          continue;
        }
        patch.moq = n;
      }
    }
    if (urlI >= 0) {
      patch.actualSupplierUrl = (cells[urlI] ?? "").trim();
    }
    if (validatedI >= 0) {
      const raw = (cells[validatedI] ?? "").trim();
      if (raw === "") patch.validatedOn = null;
      else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        // store as date input → ISO midnight UTC-ish via caller; send ISO date string
        patch.validatedOn = `${raw}T00:00:00.000Z`;
      } else if (!Number.isNaN(Date.parse(raw))) {
        patch.validatedOn = new Date(raw).toISOString();
      } else {
        errors.push(`Row ${r + 1}: invalid validatedOn`);
        continue;
      }
    }

    items.push(patch);
  }

  return { items, errors };
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
