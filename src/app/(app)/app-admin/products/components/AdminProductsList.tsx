"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { trpc } from "@/trpc/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import type { Product, Supplier } from "@/payload-types";
import {
  dateInputToIso,
  validatedOnToInputValue,
} from "@/lib/product-validated-on";
import { firstProductImageUrl } from "@/lib/media-url";
import {
  csvRowsToProductPatches,
  downloadTextFile,
  parseCsv,
  productsToCsv,
} from "@/lib/admin-product-csv";
import { ProductDeleteDialog } from "./ProductDeleteDialog";
import { MassUploadPhotosDialog } from "@/components/products/MassUploadPhotosDialog";

type RowDraft = {
  title: string;
  category: string;
  unitPrice: string;
  moq: string;
  actualSupplierUrl: string;
  /** `YYYY-MM-DD` or empty */
  validatedOn: string;
};

function draftFromProduct(p: Product): RowDraft {
  return {
    title: p.title,
    category: p.category ?? "",
    unitPrice: p.unitPrice != null ? String(p.unitPrice) : "",
    moq: p.moq != null ? String(p.moq) : "",
    actualSupplierUrl: p.actualSupplierUrl ?? "",
    validatedOn: validatedOnToInputValue(p.validatedOn),
  };
}

function supplierCompanyName(supplier: Product["supplier"]): string {
  if (!supplier) return "—";
  if (typeof supplier === "string") return supplier;
  return (supplier as Supplier).companyName || "—";
}

function isRowDirty(p: Product, d: RowDraft): boolean {
  const base = draftFromProduct(p);
  return (
    d.title !== base.title ||
    d.category !== base.category ||
    d.unitPrice !== base.unitPrice ||
    d.moq !== base.moq ||
    d.actualSupplierUrl !== base.actualSupplierUrl ||
    d.validatedOn !== base.validatedOn
  );
}

function buildUpdatePayload(p: Product, d: RowDraft) {
  const patch: {
    id: string;
    title?: string;
    category?: string;
    unitPrice?: number | null;
    moq?: number | null;
    actualSupplierUrl?: string;
    validatedOn?: string | null;
  } = { id: p.id };

  if (d.title.trim() !== p.title) {
    patch.title = d.title.trim();
  }
  if (d.category !== (p.category ?? "")) {
    patch.category = d.category.trim();
  }

  const upStr = d.unitPrice.trim();
  if (upStr === "") {
    if ((p.unitPrice ?? null) != null) {
      patch.unitPrice = null;
    }
  } else {
    const n = parseFloat(upStr);
    if (Number.isNaN(n) || n < 0) {
      throw new Error("Unit price must be a non-negative number");
    }
    if (n !== (p.unitPrice ?? null)) {
      patch.unitPrice = n;
    }
  }

  const mqStr = d.moq.trim();
  if (mqStr === "") {
    if ((p.moq ?? null) != null) {
      patch.moq = null;
    }
  } else {
    const m = parseInt(mqStr, 10);
    if (Number.isNaN(m) || m < 0) {
      throw new Error("MOQ must be a non-negative integer");
    }
    if (m !== (p.moq ?? null)) {
      patch.moq = m;
    }
  }

  if (d.actualSupplierUrl.trim() !== (p.actualSupplierUrl ?? "").trim()) {
    patch.actualSupplierUrl = d.actualSupplierUrl.trim();
  }

  const draftYmd = d.validatedOn.trim();
  const currentYmd = validatedOnToInputValue(p.validatedOn);
  if (draftYmd !== currentYmd) {
    if (draftYmd === "") {
      if (p.validatedOn) {
        patch.validatedOn = null;
      }
    } else {
      patch.validatedOn = dateInputToIso(draftYmd);
    }
  }

  const keys = Object.keys(patch).filter((k) => k !== "id");
  if (keys.length === 0) {
    return null;
  }

  return patch;
}

export function AdminProductsList() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<
    | "-createdAt"
    | "createdAt"
    | "title"
    | "-title"
    | "unitPrice"
    | "-unitPrice"
    | "moq"
    | "-moq"
    | "validatedOn"
    | "-validatedOn"
  >("-createdAt");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [supplierId, setSupplierId] = useState<string | undefined>(undefined);

  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState("");
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, supplierId, sort]);

  useEffect(() => {
    setDrafts({});
    setSelectedIds(new Set());
  }, [page, debouncedSearch, supplierId, sort]);

  const { data, isLoading } = trpc.admin.products.list.useQuery({
    page,
    limit: 20,
    search: debouncedSearch.trim() || undefined,
    supplierId,
    sort,
  });

  const { data: vendorsData } = trpc.admin.vendors.list.useQuery({
    page: 1,
    limit: 100,
    sort: "companyName",
  });

  const utils = trpc.useUtils();

  const updateMutation = trpc.admin.products.update.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Product updated");
      void utils.admin.products.list.invalidate();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[vars.id];
        return next;
      });
    },
    onError: (err) => {
      toast.error(err.message || "Update failed");
    },
    onSettled: () => {
      setSavingId(null);
    },
  });

  const bulkUpdateMutation = trpc.admin.products.bulkUpdate.useMutation();
  const bulkDeleteMutation = trpc.admin.products.bulkDelete.useMutation();

  const getDraft = (p: Product): RowDraft =>
    drafts[p.id] ?? draftFromProduct(p);

  const setDraftField = (
    id: string,
    p: Product,
    partial: Partial<RowDraft>
  ) => {
    setDrafts((prev) => {
      const current = prev[id] ?? draftFromProduct(p);
      return { ...prev, [id]: { ...current, ...partial } };
    });
  };

  const handleSave = (p: Product) => {
    const d = getDraft(p);
    if (!d.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      const payload = buildUpdatePayload(p, d);
      if (!payload) {
        toast.message("No changes to save");
        return;
      }
      setSavingId(p.id);
      updateMutation.mutate(payload);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Invalid values");
    }
  };

  const dirtyCount =
    data?.docs.reduce((n, raw) => {
      const p = raw as Product;
      return isRowDirty(p, getDraft(p)) ? n + 1 : n;
    }, 0) ?? 0;

  const handleSaveAll = async () => {
    if (!data?.docs.length) return;
    const items: Array<{
      id: string;
      title?: string;
      category?: string;
      unitPrice?: number | null;
      moq?: number | null;
      actualSupplierUrl?: string;
      validatedOn?: string | null;
    }> = [];

    for (const raw of data.docs) {
      const p = raw as Product;
      const d = getDraft(p);
      if (!isRowDirty(p, d)) continue;
      if (!d.title.trim()) {
        toast.error(`Title required for “${p.title || p.id}”`);
        return;
      }
      try {
        const payload = buildUpdatePayload(p, d);
        if (payload) items.push(payload);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Invalid values");
        return;
      }
    }

    if (items.length === 0) {
      toast.message("No changes to save");
      return;
    }

    setSavingAll(true);
    try {
      const result = await bulkUpdateMutation.mutateAsync({ items });
      await utils.admin.products.list.invalidate();
      setDrafts({});
      if (result.errors?.length) {
        toast.warning(
          `Updated ${result.updatedCount}; ${result.errors.length} failed`,
        );
      } else {
        toast.success(`Saved ${result.updatedCount} product(s)`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bulk save failed");
    } finally {
      setSavingAll(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const exported = await utils.admin.products.list.fetch({
        page: 1,
        limit: 200,
        search: debouncedSearch.trim() || undefined,
        supplierId,
        sort,
      });
      const csv = productsToCsv(exported.docs as Product[]);
      downloadTextFile(
        `products-export-${new Date().toISOString().slice(0, 10)}.csv`,
        csv,
        "text/csv;charset=utf-8",
      );
      toast.success(`Exported ${exported.docs.length} product(s)`);
      if (exported.totalDocs > exported.docs.length) {
        toast.message(
          `Showing first ${exported.docs.length} of ${exported.totalDocs}. Narrow filters to export the rest.`,
        );
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  const handleImportFile = async (file: File) => {
    setImportBusy(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const { items, errors } = csvRowsToProductPatches(rows);
      if (errors.length && items.length === 0) {
        toast.error(errors[0]);
        return;
      }
      if (items.length === 0) {
        toast.error("No valid rows to import");
        return;
      }
      if (items.length > 200) {
        toast.error("Import is limited to 200 rows at a time");
        return;
      }

      const result = await bulkUpdateMutation.mutateAsync({ items });
      await utils.admin.products.list.invalidate();
      setImportOpen(false);

      if (result.errors?.length || errors.length) {
        toast.warning(
          `Updated ${result.updatedCount}. Parse issues: ${errors.length}. Update errors: ${result.errors?.length ?? 0}.`,
        );
      } else {
        toast.success(`Imported updates for ${result.updatedCount} product(s)`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImportBusy(false);
    }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (bulkDeleteConfirm !== "DELETE" || selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const result = await bulkDeleteMutation.mutateAsync({
        ids: Array.from(selectedIds),
      });
      await utils.admin.products.list.invalidate();
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      setBulkDeleteConfirm("");
      if (result.errors?.length) {
        toast.warning(
          `Deleted ${result.deletedCount}; ${result.errors.length} failed`,
        );
      } else {
        toast.success(`Deleted ${result.deletedCount} product(s)`);
      }
      if (data && result.deletedCount >= data.docs.length && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bulk delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load products</p>
      </div>
    );
  }

  const pageIds = data.docs.map((d) => (d as Product).id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected =
    pageIds.some((id) => selectedIds.has(id)) && !allPageSelected;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleExportCsv()}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setImportOpen(true)}
        >
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
        <MassUploadPhotosDialog
          mode="admin"
          supplierId={supplierId}
          companyName={
            supplierId
              ? vendorsData?.vendors?.find((v) => v.id === supplierId)
                  ?.companyName
              : undefined
          }
        />
        <Button type="button" asChild>
          <Link href="/app-admin/products/new">New product</Link>
        </Button>
      </div>
      <p className="text-sm text-gray-600">
        Edit cells like a spreadsheet, then use row <strong>Save</strong> or{" "}
        <strong>Save all changes</strong>. For Excel/Google Sheets: Export CSV →
        edit → Import CSV (keep the <code className="text-xs">id</code> column).
        Full form: open Editor.
      </p>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:max-w-md">
          <label className="text-sm font-medium text-gray-700">Search</label>
          <Input
            placeholder="Title or category…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-56">
          <label className="text-sm font-medium text-gray-700">Supplier</label>
          <Select
            value={supplierId ?? "all"}
            onValueChange={(v) => setSupplierId(v === "all" ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All suppliers</SelectItem>
              {vendorsData?.vendors?.map(
                (v: { id: string; companyName?: string }) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.companyName || v.id}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <Select
              value={sort}
              onValueChange={(v) => setSort(v as typeof sort)}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-createdAt">Newest</SelectItem>
                <SelectItem value="createdAt">Oldest</SelectItem>
                <SelectItem value="title">Title (A–Z)</SelectItem>
                <SelectItem value="-title">Title (Z–A)</SelectItem>
                <SelectItem value="unitPrice">Price (low → high)</SelectItem>
                <SelectItem value="-unitPrice">Price (high → low)</SelectItem>
                <SelectItem value="moq">MOQ (low → high)</SelectItem>
                <SelectItem value="-moq">MOQ (high → low)</SelectItem>
                <SelectItem value="-validatedOn">Validated (newest)</SelectItem>
                <SelectItem value="validatedOn">Validated (oldest)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              disabled={dirtyCount === 0 || savingAll}
              onClick={() => void handleSaveAll()}
            >
              <Save className="mr-2 h-4 w-4" />
              {savingAll
                ? "Saving…"
                : dirtyCount > 0
                  ? `Save all changes (${dirtyCount})`
                  : "Save all changes"}
            </Button>
            {selectedIds.size > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => {
                  setBulkDeleteConfirm("");
                  setBulkDeleteOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete selected ({selectedIds.size})
              </Button>
            ) : null}
          </div>
          <div className="text-sm text-gray-600">
            {data.totalDocs} product{data.totalDocs !== 1 ? "s" : ""} total
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      allPageSelected
                        ? true
                        : somePageSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={(checked) => {
                      if (checked === true) {
                        setSelectedIds(new Set(pageIds));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    aria-label="Select all on this page"
                  />
                </TableHead>
                <TableHead className="w-[72px]">Image</TableHead>
                <TableHead className="min-w-[140px]">Title</TableHead>
                <TableHead className="w-20 text-center shrink-0">
                  Editor
                </TableHead>
                <TableHead className="min-w-[100px]">Category</TableHead>
                <TableHead className="min-w-[100px]">Unit price</TableHead>
                <TableHead className="min-w-[72px]">MOQ</TableHead>
                <TableHead className="min-w-[180px]">
                  Actual supplier URL
                </TableHead>
                <TableHead className="min-w-[140px]">Validated on</TableHead>
                <TableHead className="min-w-[120px]">Supplier</TableHead>
                <TableHead className="w-12 text-center">Info</TableHead>
                <TableHead className="min-w-[128px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.docs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-12">
                    <p className="text-lg font-semibold text-gray-900">
                      No products found
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Try another search or supplier filter.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                data.docs.map((raw) => {
                  const p = raw as Product;
                  const d = getDraft(p);
                  const dirty = isRowDirty(p, d);
                  const imageUrl = firstProductImageUrl(p.images);
                  const selected = selectedIds.has(p.id);

                  return (
                    <TableRow key={p.id} data-state={selected ? "selected" : undefined}>
                      <TableCell className="align-middle">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) =>
                            toggleSelect(p.id, checked === true)
                          }
                          aria-label={`Select ${p.title}`}
                        />
                      </TableCell>
                      <TableCell className="align-middle">
                        {imageUrl ? (
                          <div className="relative h-12 w-12 overflow-hidden rounded border bg-gray-50">
                            <Image
                              src={imageUrl}
                              alt={p.title || "Product"}
                              fill
                              sizes="48px"
                              className="object-cover"
                              unoptimized={
                                imageUrl.startsWith("/api/media/") ||
                                imageUrl.includes("/api/media/")
                              }
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded border bg-gray-100 text-[10px] text-gray-400">
                            —
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={d.title}
                          onChange={(e) =>
                            setDraftField(p.id, p, { title: e.target.value })
                          }
                          className="min-w-[220px]"
                          aria-label="Title"
                          title={d.title.length > 48 ? d.title : undefined}
                        />
                      </TableCell>
                      <TableCell className="align-top text-center">
                        <Button variant="ghost" size="icon" asChild>
                          <Link
                            href={`/app-admin/products/${p.id}`}
                            aria-label={`Full edit ${p.title}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={d.category}
                          onChange={(e) =>
                            setDraftField(p.id, p, { category: e.target.value })
                          }
                          className="min-w-[100px]"
                          aria-label="Category"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={d.unitPrice}
                          onChange={(e) =>
                            setDraftField(p.id, p, {
                              unitPrice: e.target.value,
                            })
                          }
                          className="min-w-[90px]"
                          inputMode="decimal"
                          aria-label="Unit price"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={d.moq}
                          onChange={(e) =>
                            setDraftField(p.id, p, { moq: e.target.value })
                          }
                          className="min-w-[72px]"
                          inputMode="numeric"
                          aria-label="MOQ"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={d.actualSupplierUrl}
                          onChange={(e) =>
                            setDraftField(p.id, p, {
                              actualSupplierUrl: e.target.value,
                            })
                          }
                          className="min-w-[220px]"
                          placeholder="https://…"
                          aria-label="Actual supplier URL"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="date"
                          value={d.validatedOn}
                          onChange={(e) =>
                            setDraftField(p.id, p, {
                              validatedOn: e.target.value,
                            })
                          }
                          className="min-w-[140px]"
                          aria-label="Validated on"
                        />
                      </TableCell>
                      <TableCell className="align-top text-sm text-gray-700">
                        {supplierCompanyName(p.supplier)}
                      </TableCell>
                      <TableCell className="align-top text-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-gray-600"
                              aria-label="View description"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Description</DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {p.description?.trim()
                                ? p.description
                                : "No description on file."}
                            </p>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={!dirty || savingId === p.id}
                            onClick={() => handleSave(p)}
                          >
                            {savingId === p.id ? "Saving…" : "Save"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            aria-label={`Delete ${p.title}`}
                            onClick={() =>
                              setDeleteTarget({ id: p.id, title: p.title })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {(page - 1) * data.limit + 1} to{" "}
            {Math.min(page * data.limit, data.totalDocs)} of {data.totalDocs}{" "}
            products
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm text-gray-600">
              Page {page} of {data.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {deleteTarget ? (
        <ProductDeleteDialog
          productId={deleteTarget.id}
          productTitle={deleteTarget.title}
          open={true}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onSuccess={() => {
            if (data && data.docs.length === 1 && page > 1) {
              setPage((p) => Math.max(1, p - 1));
            }
            const id = deleteTarget.id;
            setDrafts((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }}
        />
      ) : null}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import CSV mass update</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              Upload a CSV exported from this page (or matching columns). Required:{" "}
              <code className="text-xs">id</code>. Updatable: title, category,
              unitPrice, moq, actualSupplierUrl, validatedOn (YYYY-MM-DD).
            </p>
            <p>
              Do not change <code className="text-xs">id</code>. Max 200 rows.
            </p>
            <Input
              type="file"
              accept=".csv,text/csv"
              disabled={importBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleImportFile(file);
              }}
            />
            {importBusy ? (
              <p className="text-sm text-gray-500">Importing…</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          setBulkDeleteOpen(open);
          if (!open) setBulkDeleteConfirm("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete {selectedIds.size} product
              {selectedIds.size === 1 ? "" : "s"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Permanently remove the selected products? This cannot be
                  undone.
                </p>
                <div className="pt-2">
                  <Label htmlFor="bulk-delete-confirm">
                    Type <strong>DELETE</strong> to confirm
                  </Label>
                  <Input
                    id="bulk-delete-confirm"
                    className="mt-2"
                    value={bulkDeleteConfirm}
                    onChange={(e) => setBulkDeleteConfirm(e.target.value)}
                    placeholder="DELETE"
                    autoComplete="off"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkDeleteConfirm !== "DELETE" || bulkDeleting}
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                void handleBulkDelete();
              }}
            >
              {bulkDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
