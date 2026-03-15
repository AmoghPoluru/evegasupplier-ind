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

interface BecomeBuyerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BecomeBuyerDialog({
  open,
  onOpenChange,
  onSuccess,
}: BecomeBuyerDialogProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: '',
    companyType: '' as 'retailer' | 'wholesaler' | 'distributor' | 'manufacturer' | 'ecommerce' | 'other' | '',
    businessRegistrationNumber: '',
    taxId: '',
    companyWebsite: '',
    companyAddress: {
      street: '',
      city: '',
      state: '',
      zipcode: '',
      country: 'United States',
    },
    companyPhone: '',
    companyEmail: '',
    annualPurchaseVolume: '',
    mainBusiness: '',
  });

  const registerBuyer = trpc.auth.registerBuyer.useMutation({
    onSuccess: () => {
      toast.success('Buyer registration submitted successfully!');
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
      router.push('/buyer/pending?registered=true');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to register as buyer');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName || !formData.companyType) {
      toast.error('Please fill in all required fields');
      return;
    }

    registerBuyer.mutate({
      companyName: formData.companyName,
      companyType: formData.companyType as any,
      businessRegistrationNumber: formData.businessRegistrationNumber || undefined,
      taxId: formData.taxId || undefined,
      companyWebsite: formData.companyWebsite || undefined,
      companyAddress: formData.companyAddress,
      companyPhone: formData.companyPhone || undefined,
      companyEmail: formData.companyEmail || undefined,
      annualPurchaseVolume: formData.annualPurchaseVolume || undefined,
      mainBusiness: formData.mainBusiness || undefined,
    });
  };

  const isSubmitting = registerBuyer.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Become a Buyer</DialogTitle>
          <DialogDescription>
            Fill out the form below to register as a buyer. Your registration will be reviewed and approved by our team.
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
                  <SelectItem value="retailer">Retailer</SelectItem>
                  <SelectItem value="wholesaler">Wholesaler</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  <SelectItem value="ecommerce">E-commerce</SelectItem>
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
              <Label htmlFor="companyPhone">Company Phone</Label>
              <Input
                id="companyPhone"
                type="tel"
                value={formData.companyPhone}
                onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="companyEmail">Company Email</Label>
              <Input
                id="companyEmail"
                type="email"
                value={formData.companyEmail}
                onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="annualPurchaseVolume">Annual Purchase Volume</Label>
              <Select
                value={formData.annualPurchaseVolume}
                onValueChange={(value) => setFormData({ ...formData, annualPurchaseVolume: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select volume" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under_100k">Under $100K</SelectItem>
                  <SelectItem value="100k_500k">$100K - $500K</SelectItem>
                  <SelectItem value="500k_1m">$500K - $1M</SelectItem>
                  <SelectItem value="1m_5m">$1M - $5M</SelectItem>
                  <SelectItem value="over_5m">Over $5M</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={formData.companyAddress.street}
                onChange={(e) => setFormData({
                  ...formData,
                  companyAddress: { ...formData.companyAddress, street: e.target.value }
                })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.companyAddress.city}
                onChange={(e) => setFormData({
                  ...formData,
                  companyAddress: { ...formData.companyAddress, city: e.target.value }
                })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.companyAddress.state}
                onChange={(e) => setFormData({
                  ...formData,
                  companyAddress: { ...formData.companyAddress, state: e.target.value }
                })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="zipcode">Zipcode</Label>
              <Input
                id="zipcode"
                value={formData.companyAddress.zipcode}
                onChange={(e) => setFormData({
                  ...formData,
                  companyAddress: { ...formData.companyAddress, zipcode: e.target.value }
                })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.companyAddress.country}
                onChange={(e) => setFormData({
                  ...formData,
                  companyAddress: { ...formData.companyAddress, country: e.target.value }
                })}
                disabled={isSubmitting}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="mainBusiness">Main Business Description</Label>
              <Textarea
                id="mainBusiness"
                value={formData.mainBusiness}
                onChange={(e) => setFormData({ ...formData, mainBusiness: e.target.value })}
                rows={3}
                disabled={isSubmitting}
              />
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
