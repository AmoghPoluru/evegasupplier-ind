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
import { trpc } from '@/trpc/client';
import { toast } from 'sonner';

const ROLES = [
  { value: 'user', label: 'User' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'admin', label: 'Admin' },
  { value: 'bdo', label: 'BDO' },
] as const;

const OAUTH_PROVIDERS = [
  { value: 'email', label: 'Email / password' },
  { value: 'google', label: 'Google' },
  { value: 'facebook', label: 'Facebook' },
] as const;

interface UserEditDialogProps {
  userId: string;
  userLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UserEditDialog({
  userId,
  userLabel,
  open,
  onOpenChange,
  onSuccess,
}: UserEditDialogProps) {
  const { data: user, isLoading } = trpc.admin.users.getOne.useQuery(
    { userId },
    { enabled: open && !!userId },
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('user');
  const [oauthProvider, setOauthProvider] = useState<string>('email');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setRole(user.role || 'user');
      setOauthProvider(user.oauthProvider || 'email');
      setPassword('');
    }
  }, [user]);

  const updateMutation = trpc.admin.users.update.useMutation({
    onSuccess: () => {
      toast.success(`User "${userLabel}" updated`);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      userId,
      name: name.trim() || null,
      email: email.trim(),
      role: role as (typeof ROLES)[number]['value'],
      oauthProvider: oauthProvider as (typeof OAUTH_PROVIDERS)[number]['value'],
      ...(password.trim() ? { password: password.trim() } : {}),
    });
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>Update account details and role.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-oauth">Sign-in method</Label>
              <Select value={oauthProvider} onValueChange={setOauthProvider}>
                <SelectTrigger id="edit-oauth">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OAUTH_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-password">New password</Label>
              <Input
                id="edit-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                autoComplete="new-password"
              />
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
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
