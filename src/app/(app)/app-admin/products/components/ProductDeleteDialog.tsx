"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface ProductDeleteDialogProps {
  productId: string;
  productTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProductDeleteDialog({
  productId,
  productTitle,
  open,
  onOpenChange,
  onSuccess,
}: ProductDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState("");

  const utils = trpc.useUtils();

  const deleteMutation = trpc.admin.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted");
      setConfirmText("");
      onSuccess?.();
      onOpenChange(false);
      void utils.admin.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete product: ${error.message}`);
    },
  });

  const handleDelete = () => {
    if (confirmText === "DELETE") {
      deleteMutation.mutate({ id: productId });
    }
  };

  const isConfirmValid = confirmText === "DELETE";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete product
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Permanently remove <strong>{productTitle}</strong>? This cannot be
              undone.
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-900">
                If historical orders reference this product, deletion may fail
                until those references are updated or removed in Payload admin.
              </p>
            </div>
            <div className="pt-2">
              <Label
                htmlFor="confirm-delete-product"
                className="text-sm font-medium"
              >
                Type <strong>DELETE</strong> to confirm:
              </Label>
              <Input
                id="confirm-delete-product"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="mt-1"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmValid || deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete product"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
