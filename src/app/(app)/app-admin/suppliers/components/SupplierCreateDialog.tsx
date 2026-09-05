'use client';

import { useState } from 'react';
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

interface SupplierCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SupplierCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: SupplierCreateDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState<string>('');
  const [factoryLocation, setFactoryLocation] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'suspended'>(
    'approved',
  );
  const [isActive, setIsActive] = useState(true);
  const [verifiedSupplier, setVerifiedSupplier] = useState(false);

  const createMutation = trpc.admin.vendors.create.useMutation({
    onSuccess: () => {
      toast.success('Supplier created successfully');
      setEmail('');
      setPassword('');
      setName('');
      setCompanyName('');
      setCompanyType('');
      setFactoryLocation('');
      setStatus('approved');
      setIsActive(true);
      setVerifiedSupplier(false);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create supplier');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      email: email.trim(),
      password,
      name: name.trim() || undefined,
      companyName: companyName.trim(),
      companyType: companyType ?
          (companyType as 'manufacturer' | 'trading' | 'agent' | 'distributor' | 'other')
        : undefined,
      factoryLocation: factoryLocation.trim() || undefined,
      status,
      isActive,
      verifiedSupplier,
    });
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add supplier</DialogTitle>
          <DialogDescription>
            Creates a login and supplier profile. If the email already exists without a supplier
            profile, the profile is linked to that account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="companyName">Company name *</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Login email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Required for new accounts. Ignored if linking an existing user.
            </p>
          </div>

          <div>
            <Label htmlFor="name">Contact name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Defaults to company name"
            />
          </div>

          <div>
            <Label htmlFor="companyType">Company type</Label>
            <Select value={companyType} onValueChange={setCompanyType}>
              <SelectTrigger id="companyType">
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
            <Label htmlFor="factoryLocation">Factory location</Label>
            <Input
              id="factoryLocation"
              value={factoryLocation}
              onChange={(e) => setFactoryLocation(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) =>
                setStatus(v as 'pending' | 'approved' | 'rejected' | 'suspended')
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
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
              Active (visible in marketplace)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="verifiedSupplier"
              checked={verifiedSupplier}
              onCheckedChange={(checked) => setVerifiedSupplier(checked === true)}
            />
            <Label htmlFor="verifiedSupplier" className="cursor-pointer">
              Verified supplier
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
