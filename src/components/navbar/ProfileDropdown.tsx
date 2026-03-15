'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Shield, ShoppingCart, Store } from 'lucide-react';
import { trpc } from '@/trpc/client';
import { BecomeBuyerDialog } from '@/app/(app)/profile/components/BecomeBuyerDialog';
import { BecomeSupplierDialog } from '@/app/(app)/profile/components/BecomeSupplierDialog';

interface ProfileDropdownProps {
  user: any;
  hasMounted: boolean;
  isAdmin: boolean;
  logout: () => void;
}

function getUserInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileDropdown({ user, hasMounted, isAdmin, logout }: ProfileDropdownProps) {
  const { data: profileStatus, refetch } = trpc.auth.profileStatus.useQuery(undefined, {
    enabled: !!user,
  });
  const [buyerDialogOpen, setBuyerDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);

  const hasBuyer = profileStatus?.hasBuyer || false;
  const hasSupplier = profileStatus?.hasSupplier || false;
  const buyerStatus = profileStatus?.buyerStatus;
  const supplierStatus = profileStatus?.supplierStatus;

  const showBecomeBuyer = !hasBuyer && !!user;
  const showBecomeSupplier = !hasSupplier && !!user;
  const showBuyerDashboard = hasBuyer && buyerStatus === 'approved';
  const showSupplierDashboard = hasSupplier && supplierStatus === 'approved';

  const handleBuyerSuccess = () => {
    setBuyerDialogOpen(false);
    refetch();
  };

  const handleSupplierSuccess = () => {
    setSupplierDialogOpen(false);
    refetch();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar>
              <AvatarFallback>{getUserInitials(user?.name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user?.name || 'User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
              {user?.role && (
                <span className="text-xs text-muted-foreground capitalize">
                  {user.role}
                </span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {showBuyerDashboard && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/buyer/dashboard">Buyer Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          {showSupplierDashboard && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/vendor/dashboard">Supplier Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {hasMounted && isAdmin && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/app-admin/dashboard" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Admin Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {showBecomeBuyer && (
            <>
              <DropdownMenuItem onClick={() => setBuyerDialogOpen(true)}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Become a Buyer
              </DropdownMenuItem>
            </>
          )}

          {showBecomeSupplier && (
            <>
              <DropdownMenuItem onClick={() => setSupplierDialogOpen(true)}>
                <Store className="w-4 h-4 mr-2" />
                Become a Supplier
              </DropdownMenuItem>
            </>
          )}

          {(showBecomeBuyer || showBecomeSupplier) && <DropdownMenuSeparator />}

          <DropdownMenuItem asChild>
            <Link href="/profile">Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BecomeBuyerDialog
        open={buyerDialogOpen}
        onOpenChange={setBuyerDialogOpen}
        onSuccess={handleBuyerSuccess}
      />
      <BecomeSupplierDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onSuccess={handleSupplierSuccess}
      />
    </>
  );
}
