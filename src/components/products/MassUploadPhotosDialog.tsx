"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Images, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { uploadMediaFile } from "@/lib/upload-media-file";
import { trpc } from "@/trpc/client";

const ACCEPTED = {
  "image/jpeg": [],
  "image/png": [],
  "image/webp": [],
};

export type MassUploadPhotosDialogProps = {
  /** Vendor portal uses logged-in supplier; admin assigns to a supplier. */
  mode: "vendor" | "admin";
  /** Admin: pre-selected supplier (e.g. from list filter). */
  supplierId?: string;
  companyName?: string | null;
};

/**
 * Mass-upload photos → enhance (when possible) → AI copy → create one product per photo.
 * Shared by `/vendor/products` and `/app-admin/products`.
 */
export function MassUploadPhotosDialog({
  mode,
  supplierId: supplierIdProp,
  companyName: companyNameProp,
}: MassUploadPhotosDialogProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    phase?: string;
  } | null>(null);
  const [adminSupplierId, setAdminSupplierId] = useState("");

  const utils = trpc.useUtils();

  const vendorCreate = trpc.vendors.products.create.useMutation();
  const vendorSuggest = trpc.vendors.products.suggestFromImage.useMutation();
  const adminCreate = trpc.admin.products.create.useMutation();
  const adminSuggest = trpc.admin.products.suggestFromImage.useMutation();

  const { data: adminVendorsData, isLoading: adminVendorsLoading } =
    trpc.admin.vendors.list.useQuery(
      { page: 1, limit: 100, sort: "companyName" },
      { enabled: open && mode === "admin" },
    );

  const adminSuppliers = adminVendorsData?.vendors ?? [];

  const resolvedAdminSupplierId =
    supplierIdProp?.trim() ||
    adminSupplierId.trim() ||
    (adminSuppliers.length === 1 ? String(adminSuppliers[0]!.id) : "");

  const resolvedCompanyName = useMemo(() => {
    if (companyNameProp?.trim()) return companyNameProp.trim();
    if (mode === "admin" && resolvedAdminSupplierId) {
      const match = adminSuppliers.find(
        (v) => String(v.id) === resolvedAdminSupplierId,
      );
      return match?.companyName ?? null;
    }
    return null;
  }, [
    companyNameProp,
    mode,
    resolvedAdminSupplierId,
    adminSuppliers,
  ]);

  const reset = useCallback(() => {
    setFiles([]);
    setBusy(false);
    setProgress(null);
    if (!supplierIdProp) setAdminSupplierId("");
  }, [supplierIdProp]);

  const handleOpenChange = (next: boolean) => {
    if (busy) return;
    setOpen(next);
    if (!next) reset();
    else if (mode === "admin" && supplierIdProp) {
      setAdminSupplierId(supplierIdProp);
    }
  };

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const byName = new Map(prev.map((f) => [`${f.name}:${f.size}`, f]));
      for (const f of accepted) {
        byName.set(`${f.name}:${f.size}`, f);
      }
      return Array.from(byName.values());
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    multiple: true,
    disabled: busy,
  });

  const removeFile = (index: number) => {
    if (busy) return;
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    if (busy) return;
    handleOpenChange(false);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Select at least one photo");
      return;
    }

    if (mode === "admin") {
      if (adminVendorsLoading) {
        toast.error("Still loading suppliers…");
        return;
      }
      if (adminSuppliers.length === 0) {
        toast.error("No supplier found. Create a supplier first.");
        return;
      }
      if (!resolvedAdminSupplierId) {
        toast.error("Select a supplier for these products.");
        return;
      }
    }

    setBusy(true);
    setProgress({ done: 0, total: files.length, phase: "Starting…" });

    let ok = 0;
    let aiCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fallbackTitle = `Upload ${i + 1}`;
      try {
        setProgress({
          done: i,
          total: files.length,
          phase: `Enhancing & uploading ${i + 1}/${files.length}…`,
        });
        const mediaId = await uploadMediaFile(file, true);

        setProgress({
          done: i,
          total: files.length,
          phase: `AI title/description/price ${i + 1}/${files.length}…`,
        });

        let title = fallbackTitle;
        let description: string | null | undefined = null;
        let unitPrice: number | null = null;

        try {
          const suggestion =
            mode === "vendor"
              ? await vendorSuggest.mutateAsync({ mediaId, fallbackTitle })
              : await adminSuggest.mutateAsync({
                  mediaId,
                  fallbackTitle,
                  supplierId: resolvedAdminSupplierId,
                });

          title = suggestion.title || fallbackTitle;
          const desc = suggestion.description?.trim();
          description = desc ? desc : mode === "admin" ? null : undefined;
          unitPrice =
            typeof suggestion.unitPrice === "number" &&
            Number.isFinite(suggestion.unitPrice) &&
            suggestion.unitPrice >= 0
              ? suggestion.unitPrice
              : null;

          if (suggestion.usedAi) {
            aiCount += 1;
          } else if (suggestion.skipReason) {
            toast.message(`AI skipped: ${suggestion.skipReason}`);
          }
        } catch (aiErr: unknown) {
          console.warn("AI suggest failed; using fallback title", aiErr);
          toast.message(
            `AI skipped for ${file.name}: ${aiErr instanceof Error ? aiErr.message : "error"}`,
          );
        }

        if (mode === "vendor") {
          await vendorCreate.mutateAsync({
            title,
            description: description || undefined,
            unitPrice,
            images: [mediaId],
          });
        } else {
          await adminCreate.mutateAsync({
            title,
            supplier: resolvedAdminSupplierId,
            description,
            unitPrice,
            images: [mediaId],
            validatedOn: "",
          });
        }

        ok += 1;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed";
        errors.push(`${file.name}: ${msg}`);
      }
      setProgress({ done: i + 1, total: files.length, phase: "…" });
    }

    if (mode === "vendor") {
      await utils.products.getByVendor.invalidate();
    } else {
      await utils.admin.products.list.invalidate();
    }

    setBusy(false);

    const supplierLabel = resolvedCompanyName ?? "supplier";

    if (ok > 0 && errors.length === 0) {
      toast.success(
        `Created ${ok} product(s)` +
          (aiCount > 0 ? ` · AI filled ${aiCount} listing(s)` : "") +
          (mode === "vendor" || resolvedCompanyName
            ? ` for ${supplierLabel}`
            : ""),
      );
      handleOpenChange(false);
      return;
    }

    if (ok > 0) {
      toast.warning(`Created ${ok} of ${files.length}. Some failed.`);
      errors.slice(0, 3).forEach((e) => toast.error(e));
      return;
    }

    toast.error(errors[0] || "Upload failed");
  };

  const openAiHint =
    mode === "vendor"
      ? "Set OPENAI_API_KEY in Account Settings for AI suggestions."
      : "Requires OPENAI_API_KEY on this supplier (Edit Supplier) — not the server .env key.";

  const showAdminSupplierPicker =
    mode === "admin" && !supplierIdProp && adminSuppliers.length > 1;

  const uploadDisabled =
    files.length === 0 ||
    busy ||
    (mode === "admin" &&
      (adminVendorsLoading ||
        (adminSuppliers.length > 0 && !resolvedAdminSupplierId)));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Images className="mr-2 h-4 w-4" />
          Mass Upload Photos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mass upload photos</DialogTitle>
          <DialogDescription>
            Each photo is lightly enhanced (when possible), uploaded via Vercel
            Blob, then OpenAI suggests a title, description, and wholesale unit
            price. Products are added
            {resolvedCompanyName
              ? ` for ${resolvedCompanyName}`
              : mode === "vendor"
                ? " to your catalog"
                : " to the selected supplier"}
            . {openAiHint}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showAdminSupplierPicker && (
            <div className="space-y-2">
              <Label htmlFor="mass-upload-supplier">Supplier</Label>
              <Select
                value={adminSupplierId || undefined}
                onValueChange={setAdminSupplierId}
                disabled={busy}
              >
                <SelectTrigger id="mass-upload-supplier">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {adminSuppliers.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.companyName || v.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div
            {...getRootProps()}
            className={cn(
              "rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              busy ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-gray-300 hover:border-gray-400",
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto mb-3 h-10 w-10 text-gray-400" />
            <p className="text-sm text-gray-600">
              {isDragActive
                ? "Drop photos here…"
                : "Drag & drop photos here, or click to select"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              JPEG, PNG, or WebP · up to 10MB each · enhance + AI when available
            </p>
          </div>

          {files.length > 0 && (
            <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-2">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50"
                >
                  <span className="min-w-0 truncate text-gray-800">
                    {file.name}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 shrink-0 p-0"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {progress && (
            <p className="text-sm text-gray-600">
              {progress.phase} ({progress.done}/{progress.total})
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleUpload()}
            disabled={uploadDisabled}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Working…
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
