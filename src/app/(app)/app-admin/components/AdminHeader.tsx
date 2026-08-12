'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { trpc } from '@/trpc/client';

const pageTitles: Record<string, string> = {
  '/app-admin/dashboard': 'Dashboard',
  '/app-admin/suppliers': 'All Suppliers',
  '/app-admin/products': 'Products',
  '/app-admin/users': 'Users',
  '/app-admin/buyers': 'All Buyers',
  '/app-admin/orders': 'Orders',
};

function resolvePageTitle(pathname: string | null): string {
  if (!pathname) return 'Admin';
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/app-admin/products/new')) return 'New product';
  if (pathname.match(/^\/app-admin\/products\/[^/]+$/)) return 'Edit product';
  if (pathname.match(/^\/app-admin\/orders\/[^/]+$/)) return 'Order detail';
  return 'Admin';
}

export function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);
  const { data: session } = trpc.auth.session.useQuery();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/sign-in');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/sign-in');
    }
  };

  const user = session?.user;
  const userName = user?.name || user?.email || 'Admin';
  const userEmail = user?.email || '';
  const pageTitle = resolvePageTitle(pathname);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>

      <div className="flex items-center gap-4">
        {!hasMounted ? (
          <div className="h-9 w-24" aria-hidden />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{userName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{userName}</span>
                  <span className="text-xs text-gray-500">{userEmail}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">My Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
