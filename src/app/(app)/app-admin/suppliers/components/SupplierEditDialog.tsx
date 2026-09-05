'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { trpc } from '@/trpc/client';
import { toast } from 'sonner';

const BDO_NONE = '__none__';

function relationId(value: unknown): string {
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' && id) return id;
  }
  return '';
}

interface SupplierEditDialogProps {
  supplierId: string;
  supplierName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SupplierEditDialog({
  supplierId,
  supplierName,
  open,
  onOpenChange,
  onSuccess,
}: SupplierEditDialogProps) {
  const { data: supplier, isLoading } = trpc.admin.vendors.getOne.useQuery(
    { vendorId: supplierId },
    { enabled: open && !!supplierId },
  );

  const { data: bdoCandidates = [] } =
    trpc.admin.users.listBdoCandidates.useQuery(undefined, {
      enabled: open,
    });

  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [status, setStatus] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [bdoId, setBdoId] = useState(BDO_NONE);
  const [openaiApiKey, setOpenaiApiKey] = useState('');

  useEffect(() => {
    if (supplier) {
      setCompanyName(supplier.companyName || '');
      setCompanyType(supplier.companyType || '');
      setStatus((supplier as { status?: string }).status || 'pending');
      setIsActive(Boolean((supplier as { isActive?: boolean }).isActive));
      setBdoId(relationId(supplier.bdo) || BDO_NONE);
      setOpenaiApiKey(
        typeof supplier.openaiApiKey === 'string' ? supplier.openaiApiKey : '',
      );
    }
  }, [supplier]);

  const updateMutation = trpc.admin.vendors.update.useMutation({
    onSuccess: () => {
      toast.success(`Supplier "${supplierName}" updated successfully`);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to update supplier: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updateData: Record<string, unknown> = {
      companyName,
      status: status || 'pending',
      isActive,
      bdo: bdoId === BDO_NONE ? null : bdoId,
    };

    if (companyType) {
      updateData.companyType = companyType;
    }

    const key = openaiApiKey.trim();
    if (key) {
      updateData.openaiApiKey = key;
    } else if (
      typeof supplier?.openaiApiKey === 'string' &&
      supplier.openaiApiKey.length > 0
    ) {
      updateData.openaiApiKey = null;
    }

    updateMutation.mutate({
      vendorId: supplierId,
      data: updateData,
    });
  };

  if (!open) return null;

  // Keep current BDO in the list even if their role changed or they were soft-orphaned
  const bdoOptions = [...bdoCandidates];
  const currentBdoId = relationId(supplier?.bdo);
  if (
    currentBdoId &&
    !bdoOptions.some((u) => u.id === currentBdoId) &&
    supplier?.bdo &&
    typeof supplier.bdo === 'object'
  ) {
    const orphan = supplier.bdo as {
      id?: string;
      name?: string | null;
      email?: string | null;
      role?: string | null;
    };
    if (orphan.id) {
      bdoOptions.unshift({
        id: orphan.id,
        name: orphan.name ?? null,
        email: orphan.email ?? '',
        role: (orphan.role === 'admin' || orphan.role === 'bdo'
          ? orphan.role
          : 'bdo') as 'admin' | 'bdo',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Supplier</DialogTitle>
          <DialogDescription>
            Update supplier information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="companyType">Company Type</Label>
              <Select value={companyType} onValueChange={setCompanyType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  <SelectItem value="trading">Trading Company</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bdo">BDO</Label>
              <Select value={bdoId} onValueChange={setBdoId}>
                <SelectTrigger id="bdo">
                  <SelectValue placeholder="Assign a BDO" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BDO_NONE}>None</SelectItem>
                  {bdoOptions.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {(user.name || user.email || user.id) +
                        (user.role ? ` (${user.role})` : '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Platform BDO coordinating this supplier. Admins and BDOs can be
                assigned.
              </p>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active (can sell products)
              </Label>
            </div>

            <div>
              <Label htmlFor="openaiApiKey">OPENAI_API_KEY</Label>
              <Input
                id="openaiApiKey"
                type="password"
                autoComplete="off"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-… (optional; used for AI titles on mass upload)"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Stored on this supplier and used for mass-upload AI titles/descriptions
                (not the server .env key). Leave empty to skip AI.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
