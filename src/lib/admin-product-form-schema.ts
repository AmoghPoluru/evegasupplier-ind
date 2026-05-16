import { z } from "zod";
import {
  validatedOnInputToPayloadIso,
} from "@/lib/product-validated-on";

export const bulkPricingTierSchema = z.object({
  minQuantity: z.number().min(0),
  price: z.number().min(0),
  unit: z.string().max(64).optional().nullable(),
});

export const adminProductCreateInputSchema = z.object({
  title: z.string().trim().min(1),
  supplier: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  actualSupplierUrl: z
    .string()
    .max(2048)
    .nullable()
    .optional()
    .refine(
      (v) => v == null || v === "" || /^https?:\/\/.+/i.test(String(v).trim()),
      {
        message:
          "Actual supplier URL must be empty or start with http:// or https://",
      }
    ),
  unitPrice: z.number().min(0).nullable().optional(),
  moq: z.number().int().min(0).nullable().optional(),
  bulkPricingTiers: z.array(bulkPricingTierSchema).optional(),
  sampleAvailable: z.boolean().optional(),
  samplePrice: z.number().min(0).nullable().optional(),
  customizationAvailable: z.boolean().optional(),
  leadTime: z.string().nullable().optional(),
  packagingOptions: z
    .array(z.object({ option: z.string() }))
    .transform((rows) =>
      rows
        .map((r) => ({ option: r.option.trim() }))
        .filter((r) => r.option.length > 0),
    )
    .optional(),
  shippingTerms: z
    .array(z.object({ term: z.string() }))
    .transform((rows) =>
      rows
        .map((r) => ({ term: r.term.trim() }))
        .filter((r) => r.term.length > 0),
    )
    .optional(),
  paymentTerms: z
    .array(z.object({ term: z.string() }))
    .transform((rows) =>
      rows
        .map((r) => ({ term: r.term.trim() }))
        .filter((r) => r.term.length > 0),
    )
    .optional(),
  productCertifications: z
    .array(z.object({ certification: z.string() }))
    .transform((rows) =>
      rows
        .map((r) => ({ certification: r.certification.trim() }))
        .filter((r) => r.certification.length > 0),
    )
    .optional(),
  hsCode: z.string().nullable().optional(),
  originCountry: z.string().nullable().optional(),
  images: z
    .array(z.string())
    .transform((ids) =>
      ids.map((id) => id.trim()).filter((id) => id.length > 0),
    )
    .optional(),
  validatedOn: z
    .string()
    .default("")
    .refine(
      (v) => {
        if (v === "") return true;
        const ts = /^\d{4}-\d{2}-\d{2}$/.test(v)
          ? Date.parse(`${v}T12:00:00.000Z`)
          : Date.parse(v);
        return !Number.isNaN(ts);
      },
      {
        message: "Validated on must be a valid date, empty, or null",
      },
    ),
});

export const adminProductUpdateFullInputSchema =
  adminProductCreateInputSchema.extend({
    id: z.string(),
  });

export type AdminProductFormValues = z.infer<
  typeof adminProductCreateInputSchema
>;

const MONGO_ID_HEX = /^[a-f0-9]{24}$/i;

export function normalizeProductImageIds(ids?: string[]): string[] | null {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids ?? []) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (!id || seen.has(id) || !MONGO_ID_HEX.test(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.length ? out : null;
}

export function toPayloadProductData(
  input: AdminProductFormValues
): Record<string, unknown> {
  const desc = input.description?.trim();
  const cat = input.category?.trim();
  const urlRaw = input.actualSupplierUrl;
  const url = typeof urlRaw === "string" ? urlRaw.trim() : "";
  const vRaw = input.validatedOn;
  const tiers = (input.bulkPricingTiers ?? []).map((t) => ({
    minQuantity: t.minQuantity,
    price: t.price,
    unit: t.unit?.trim() || null,
  }));
  const pack = input.packagingOptions ?? [];
  const ship = input.shippingTerms ?? [];
  const pay = input.paymentTerms ?? [];
  const certs = input.productCertifications ?? [];

  const validatedOn = validatedOnInputToPayloadIso(vRaw);

  return {
    title: input.title.trim(),
    supplier: input.supplier,
    description: !desc ? null : desc,
    category: !cat ? null : cat,
    actualSupplierUrl: !url ? null : url,
    unitPrice:
      input.unitPrice === undefined || input.unitPrice === null
        ? null
        : input.unitPrice,
    moq: input.moq === undefined || input.moq === null ? null : input.moq,
    bulkPricingTiers: tiers.length ? tiers : null,
    sampleAvailable: input.sampleAvailable ?? false,
    samplePrice:
      (input.sampleAvailable ?? false) && input.samplePrice != null
        ? input.samplePrice
        : null,
    customizationAvailable: input.customizationAvailable ?? false,
    leadTime: input.leadTime?.trim() || null,
    packagingOptions: pack.length ? pack : null,
    shippingTerms: ship.length ? ship : null,
    paymentTerms: pay.length ? pay : null,
    productCertifications: certs.length ? certs : null,
    hsCode: input.hsCode?.trim() || null,
    originCountry: input.originCountry?.trim() || null,
    images: normalizeProductImageIds(input.images),
    validatedOn,
  };
}
