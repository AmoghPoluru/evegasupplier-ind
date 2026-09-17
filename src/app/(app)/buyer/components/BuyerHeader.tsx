'use client';

import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/trpc/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SiteLogo } from '@/components/SiteLogo';

export function BuyerHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Get buyer info
  const { data: buyer } = trpc.buyers.getByUser.useQuery(
    { userId: user?.id || '' },
    { enabled: !!user?.id }
  );

  const getUserInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-24 bg-gray-800 text-white z-50 border-b border-gray-700">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-4">
          <SiteLogo
            href="/buyer/dashboard"
            imageClassName="rounded-sm bg-[#faf6ef]"
          />
          <h1 className="text-lg font-semibold">Buyer Dashboard</h1>
          {buyer && (buyer as any).companyName && (
            <span className="text-sm text-gray-300">
              {(buyer as any).companyName}
            </span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                <AvatarFallback className="bg-gray-700 text-white">
                  {getUserInitials(user?.name)}
                </AvatarFallback>
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
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/profile">Profile</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/buyer/settings">Settings</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
