'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Package,
  ShoppingCart,
  UserCircle,
  Shield,
  ExternalLink,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/app-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Supply',
    items: [
      { href: '/app-admin/suppliers', label: 'All Suppliers', icon: Users },
      {
        href: '/app-admin/vendors/pending',
        label: 'Pending Suppliers',
        icon: UserCheck,
      },
      { href: '/app-admin/products', label: 'Products', icon: Package },
    ],
  },
  {
    label: 'Demand',
    items: [
      { href: '/app-admin/buyers', label: 'All Buyers', icon: UserCircle },
      { href: '/app-admin/orders', label: 'Orders', icon: ShoppingCart },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-gray-800 bg-gray-900 text-gray-100">
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center gap-2 px-2 py-1">
          <Shield className="h-5 w-5 text-emerald-400" />
          <span className="font-semibold text-white">Admin Console</span>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-800/60 hover:text-white',
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0 text-emerald-400/90" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" />
          View marketplace
        </Link>
      </div>
    </aside>
  );
}
