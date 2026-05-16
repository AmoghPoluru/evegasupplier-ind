'use client';

import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { Home, LogOut, User, Settings } from 'lucide-react';
import { trpc } from '@/trpc/client';

export function VendorHeader() {
  const { user, logout } = useAuth();
  const { data: vendor } = trpc.vendors.getByUser.useQuery(
    { userId: user?.id || '' },
    { enabled: !!user?.id }
  );

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-gray-800 text-white border-b border-gray-700 z-50">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">
            {vendor?.companyName || 'Vendor Dashboard'}
          </h1>
          <Link
            href="/?browse=1"
            className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-700/80 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 hover:border-gray-500"
          >
            <Home className="h-4 w-4" aria-hidden />
            Home
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-blue-600 text-white">
                    {getInitials(user?.name, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {user?.name || user?.email || 'User'}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
