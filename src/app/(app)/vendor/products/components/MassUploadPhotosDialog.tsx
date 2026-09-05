"use client";

import { useCallback, useState } from "react";
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
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

const ACCEPTED = {
  "image/jpeg": [],
  "image/png": [],
  "image/webp": [],
};

async function uploadMediaFile(file: File, enhance: boolean): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  if (enhance) formData.append("enhance", "1");

  const response = await fetch("/api/media", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  let payloadUnknown: unknown;
  try {
    payloadUnknown = await response.json();
  } catch {
    payloadUnknown = null;
  }

  if (!response.ok) {
    const errMsg =
      payloadUnknown &&
      typeof payloadUnknown === "object" &&
      "error" in payloadUnknown &&
      typeof (payloadUnknown as { error: unknown }).error === "string"
        ? (payloadUnknown as { error: string }).error
        : `Upload failed (${response.status})`;
    throw new Error(errMsg);
  }

  const data = payloadUnknown as { doc?: { id?: unknown } } | null;
  const rawId = data?.doc?.id;
  const newId = rawId !== undefined && rawId !== null ? String(rawId) : "";
  if (!newId) {
    throw new Error("Upload succeeded but no media id returned");
  }
  return newId;
}

type MassUploadPhotosDialogProps = {
  companyName?: string | null;
};

/**
 * Mass-upload photos → enhance → AI title/description → create product per photo.
 * Scoped to the logged-in supplier (no supplier picker).
 */
export function MassUploadPhotosDialog({
  companyName,
}: MassUploadPhotosDialogProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    phase?: string;
  } | null>(null);

  const utils = trpc.useUtils();
  const createMutation = trpc.vendors.products.create.useMutation();
  const suggestMutation = trpc.vendors.products.suggestFromImage.useMutation();

  const reset = useCallback(() => {
    setFiles([]);
    setBusy(false);
    setProgress(null);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (busy) return;
    setOpen(next);
    if (!next) reset();
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
        let description: string | undefined;
        let unitPrice: number | null = null;
        try {
          const suggestion = await suggestMutation.mutateAsync({
            mediaId,
            fallbackTitle,
          });
          title = suggestion.title || fallbackTitle;
          description = suggestion.description?.trim()
            ? suggestion.description.trim()
            : undefined;
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

        await createMutation.mutateAsync({
          title,
          description,
          unitPrice,
          images: [mediaId],
        });
        ok += 1;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed";
        errors.push(`${file.name}: ${msg}`);
      }
      setProgress({ done: i + 1, total: files.length, phase: "…" });
    }

    await utils.products.getByVendor.invalidate();
    setBusy(false);

    if (ok > 0 && errors.length === 0) {
      toast.success(
        `Created ${ok} product(s)` +
          (aiCount > 0 ? ` · AI filled ${aiCount} listing(s)` : "") +
          (companyName ? ` for ${companyName}` : ""),
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
            Each photo is lightly enhanced, uploaded, then OpenAI suggests a
            title, description, and wholesale unit price. Products are added to
            your catalog
            {companyName ? ` (${companyName})` : ""}. Set OPENAI_API_KEY in
            Account Settings for AI suggestions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              JPEG, PNG, or WebP · enhance + AI title/description
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
            disabled={files.length === 0 || busy}
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
