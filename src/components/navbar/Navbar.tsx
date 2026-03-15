'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore } from '@/stores/cart-store';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { ShoppingCart, Store, Search, X, Shield } from 'lucide-react';
import { trpc } from '@/trpc/client';
import { checkIfAdmin } from '@/lib/auth/admin-check';
import { ProfileDropdown } from './ProfileDropdown';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const { getItemCount, items } = useCartStore();
  const [itemCount, setItemCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  
  // Get session directly to check admin status
  const { data: session, isLoading: sessionLoading } = trpc.auth.session.useQuery();
  const sessionUser = session?.user;
  
  // Check admin status - check both role field and direct property access
  const userRole = sessionUser ? ((sessionUser as any).role || (sessionUser as any)?.role) : null;
  const isAdmin = sessionUser ? checkIfAdmin(sessionUser as any) : false;
  
  // Track if component has mounted to prevent hydration mismatch
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  // Debug: Log admin status (remove in production)
  useEffect(() => {
    if (sessionUser && hasMounted) {
      console.log('🔍 Navbar Debug:');
      console.log('  - User ID:', sessionUser.id);
      console.log('  - User Email:', (sessionUser as any).email);
      console.log('  - User Role:', userRole);
      console.log('  - User Object:', sessionUser);
      console.log('  - Is Admin Check Result:', isAdmin);
      console.log('  - checkIfAdmin function result:', checkIfAdmin(sessionUser as any));
    } else if (!sessionLoading && hasMounted) {
      console.log('🔍 Navbar Debug: No user in session');
    }
  }, [sessionUser, isAdmin, userRole, sessionLoading, hasMounted]);

  // Update cart count after mount to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    setItemCount(getItemCount());
  }, [getItemCount]);

  // Update cart count when items change
  useEffect(() => {
    if (isMounted) {
      setItemCount(getItemCount());
    }
  }, [items, getItemCount, isMounted]);
  
  // Get selected supplier from URL
  const selectedSupplierId = searchParams.get('supplier') || undefined;
  
  // Fetch all published vendors for dropdown (only approved and active)
  const { data: vendorsData } = trpc.vendors.list.useQuery({
    limit: 100,
    verified: undefined, // Get all vendors
    includeUnpublished: false, // Only published suppliers
  });
  
  // Filter vendors by search query (vendors are already filtered to published only by the query)
  const filteredVendors = vendorsData?.vendors.filter((vendor) => {
    const companyName = (vendor as any).companyName || '';
    return companyName.toLowerCase().includes(supplierSearchQuery.toLowerCase());
  }) || [];
  
  // Get selected vendor name
  const selectedVendor = vendorsData?.vendors.find((v) => v.id === selectedSupplierId);
  const selectedVendorName = selectedVendor ? (selectedVendor as any).companyName : 'Select Supplier';
  
  // Handle supplier selection
  const handleSupplierSelect = (supplierId: string) => {
    setIsSupplierDropdownOpen(false);
    setSupplierSearchQuery('');
    router.push(`/?supplier=${supplierId}`);
  };
  
  // Reset search when dropdown closes
  useEffect(() => {
    if (!isSupplierDropdownOpen) {
      setSupplierSearchQuery('');
    }
  }, [isSupplierDropdownOpen]);

  const getUserInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo/Brand */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">EvegaSupply</span>
        </Link>

        {/* Navigation Links - Center */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="/"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Home
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            About
          </Link>
          
          {/* Admin Dashboard Link - Only visible to admins (after mount to prevent hydration mismatch) */}
          {hasMounted && isAdmin && (
            <Link
              href="/app-admin/dashboard"
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary text-blue-600"
            >
              <Shield className="w-4 h-4" />
              Admin Dashboard
            </Link>
          )}
          
          {/* Suppliers Dropdown */}
          <DropdownMenu open={isSupplierDropdownOpen} onOpenChange={setIsSupplierDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-sm font-medium">
                <Store className="w-4 h-4 mr-2" />
                {selectedVendorName}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="start">
              <DropdownMenuLabel>Select Supplier</DropdownMenuLabel>
              <div className="px-2 pb-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search suppliers..."
                    value={supplierSearchQuery}
                    onChange={(e) => setSupplierSearchQuery(e.target.value)}
                    className="pl-8 pr-8 h-9"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {supplierSearchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSupplierSearchQuery('');
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                {filteredVendors.length > 0 ? (
                  filteredVendors.map((vendor) => {
                    const companyName = (vendor as any).companyName || 'Unknown';
                    return (
                      <DropdownMenuItem
                        key={vendor.id}
                        onClick={() => handleSupplierSelect(vendor.id)}
                        className={selectedSupplierId === vendor.id ? 'bg-accent' : ''}
                      >
                        {companyName}
                      </DropdownMenuItem>
                    );
                  })
                ) : (
                  <DropdownMenuItem disabled>No suppliers found</DropdownMenuItem>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Side - Cart & Auth */}
        <div className="flex items-center space-x-4">
          {/* Cart Button */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="h-5 w-5" />
            {isMounted && itemCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {itemCount > 99 ? '99+' : itemCount}
              </Badge>
            )}
          </Button>

          {isAuthenticated ? (
            <ProfileDropdown user={user} hasMounted={hasMounted} isAdmin={isAdmin} logout={logout} />
          ) : (
            <Button asChild variant="default">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </nav>
  );
}
