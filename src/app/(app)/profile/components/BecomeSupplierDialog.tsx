'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/trpc/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface BecomeSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BecomeSupplierDialog({
  open,
  onOpenChange,
  onSuccess,
}: BecomeSupplierDialogProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: '',
    companyType: '' as 'manufacturer' | 'trading' | 'agent' | 'distributor' | 'other' | '',
    businessRegistrationNumber: '',
    taxId: '',
    companyWebsite: '',
    yearEstablished: '',
    employeeCount: '',
    mainMarkets: [] as string[],
    mainProducts: [] as string[],
    factoryLocation: '',
    companyDescription: '',
  });

  const registerSupplier = trpc.auth.registerSupplier.useMutation({
    onSuccess: () => {
      toast.success('Supplier registration submitted successfully!');
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
      router.push('/vendor/pending?registered=true');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to register as supplier');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName || !formData.companyType) {
      toast.error('Please fill in all required fields');
      return;
    }

    registerSupplier.mutate({
      companyName: formData.companyName,
      companyType: formData.companyType as any,
      businessRegistrationNumber: formData.businessRegistrationNumber || undefined,
      taxId: formData.taxId || undefined,
      companyWebsite: formData.companyWebsite || undefined,
      yearEstablished: formData.yearEstablished ? parseInt(formData.yearEstablished) : undefined,
      employeeCount: formData.employeeCount || undefined,
      mainMarkets: formData.mainMarkets.length > 0 ? formData.mainMarkets : undefined,
      mainProducts: formData.mainProducts.length > 0 ? formData.mainProducts : undefined,
      factoryLocation: formData.factoryLocation || undefined,
      companyDescription: formData.companyDescription || undefined,
    });
  };

  const isSubmitting = registerSupplier.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Become a Supplier</DialogTitle>
          <DialogDescription>
            Fill out the form below to register as a supplier. Your registration will be reviewed and approved by our team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="companyName">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="companyType">
                Company Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.companyType}
                onValueChange={(value) => setFormData({ ...formData, companyType: value as any })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company type" />
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
              <Label htmlFor="businessRegistrationNumber">Business Registration Number</Label>
              <Input
                id="businessRegistrationNumber"
                value={formData.businessRegistrationNumber}
                onChange={(e) => setFormData({ ...formData, businessRegistrationNumber: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="taxId">Tax ID</Label>
              <Input
                id="taxId"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="companyWebsite">Company Website</Label>
              <Input
                id="companyWebsite"
                type="url"
                value={formData.companyWebsite}
                onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                placeholder="https://example.com"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="yearEstablished">Year Established</Label>
              <Input
                id="yearEstablished"
                type="number"
                value={formData.yearEstablished}
                onChange={(e) => setFormData({ ...formData, yearEstablished: e.target.value })}
                min="1900"
                max={new Date().getFullYear()}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="employeeCount">Employee Count</Label>
              <Select
                value={formData.employeeCount}
                onValueChange={(value) => setFormData({ ...formData, employeeCount: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10</SelectItem>
                  <SelectItem value="11-50">11-50</SelectItem>
                  <SelectItem value="51-200">51-200</SelectItem>
                  <SelectItem value="201-500">201-500</SelectItem>
                  <SelectItem value="501-1000">501-1000</SelectItem>
                  <SelectItem value="over_1000">Over 1000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.companyType === 'manufacturer' && (
              <div className="md:col-span-2">
                <Label htmlFor="factoryLocation">Factory Location</Label>
                <Input
                  id="factoryLocation"
                  value={formData.factoryLocation}
                  onChange={(e) => setFormData({ ...formData, factoryLocation: e.target.value })}
                  placeholder="City, Country"
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="md:col-span-2">
              <Label htmlFor="mainMarkets">Main Markets (comma-separated)</Label>
              <Input
                id="mainMarkets"
                value={formData.mainMarkets.join(', ')}
                onChange={(e) => setFormData({
                  ...formData,
                  mainMarkets: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                })}
                placeholder="North America, Europe, Asia"
                disabled={isSubmitting}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="mainProducts">Main Products (comma-separated)</Label>
              <Input
                id="mainProducts"
                value={formData.mainProducts.join(', ')}
                onChange={(e) => setFormData({
                  ...formData,
                  mainProducts: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                })}
                placeholder="Electronics, Clothing, Accessories"
                disabled={isSubmitting}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="companyDescription">Company Description</Label>
              <Textarea
                id="companyDescription"
                value={formData.companyDescription}
                onChange={(e) => setFormData({ ...formData, companyDescription: e.target.value })}
                rows={4}
                maxLength={1000}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.companyDescription.length}/1000 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Registration'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
