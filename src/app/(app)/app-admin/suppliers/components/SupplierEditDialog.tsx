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
    { enabled: open && !!supplierId }
  );

  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [status, setStatus] = useState('');
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (supplier) {
      setCompanyName(supplier.companyName || '');
      setCompanyType(supplier.companyType || '');
      setStatus((supplier as any).status || 'pending');
      setIsActive((supplier as any).isActive || false);
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
    
    // Build data object, only including defined values
    const updateData: Record<string, unknown> = {
      companyName,
      status: status || 'pending',
      isActive,
    };
    
    // Only include companyType if it has a value
    if (companyType) {
      updateData.companyType = companyType;
    }
    
    updateMutation.mutate({
      vendorId: supplierId,
      data: updateData,
    });
  };

  if (!open) return null;

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
