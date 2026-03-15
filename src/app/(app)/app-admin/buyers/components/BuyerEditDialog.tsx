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

interface BuyerEditDialogProps {
  buyerId: string;
  buyerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BuyerEditDialog({
  buyerId,
  buyerName,
  open,
  onOpenChange,
  onSuccess,
}: BuyerEditDialogProps) {
  const { data: buyer, isLoading } = trpc.admin.buyers.getOne.useQuery(
    { buyerId },
    { enabled: open && !!buyerId }
  );

  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [verifiedBuyer, setVerifiedBuyer] = useState(false);

  useEffect(() => {
    if (buyer) {
      setCompanyName(buyer.companyName || '');
      setCompanyType(buyer.companyType || '');
      setVerifiedBuyer(buyer.verifiedBuyer || false);
    }
  }, [buyer]);

  const updateMutation = trpc.admin.buyers.update.useMutation({
    onSuccess: () => {
      toast.success(`Buyer "${buyerName}" updated successfully`);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to update buyer: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build data object, only including defined values
    const updateData: Record<string, unknown> = {
      companyName,
      verifiedBuyer,
      verificationStatus: verifiedBuyer ? 'verified' : 'pending',
    };
    
    // Only include companyType if it has a value
    if (companyType) {
      updateData.companyType = companyType;
    }
    
    updateMutation.mutate({
      buyerId,
      data: updateData,
    });
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Buyer</DialogTitle>
          <DialogDescription>
            Update buyer information
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
                  <SelectItem value="retailer">Retailer</SelectItem>
                  <SelectItem value="wholesaler">Wholesaler</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  <SelectItem value="ecommerce">E-commerce</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="verifiedBuyer"
                checked={verifiedBuyer}
                onCheckedChange={(checked) => setVerifiedBuyer(checked === true)}
              />
              <Label htmlFor="verifiedBuyer" className="cursor-pointer">
                Verified Buyer
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
