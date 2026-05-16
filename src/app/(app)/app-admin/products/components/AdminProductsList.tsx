"use client";

import { useEffect, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Product, Vendor } from "@/payload-types";
import {
  dateInputToIso,
  validatedOnToInputValue,
} from "@/lib/product-validated-on";
import { ProductDeleteDialog } from "./ProductDeleteDialog";

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
  return (supplier as Vendor).companyName || "—";
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" asChild>
          <Link href="/app-admin/products/new">New product</Link>
        </Button>
      </div>
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
          </div>
          <div className="text-sm text-gray-600">
            {data.totalDocs} product{data.totalDocs !== 1 ? "s" : ""} total
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={10} className="text-center py-12">
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

                  return (
                    <TableRow key={p.id}>
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
    </div>
  );
}
