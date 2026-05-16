'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BdoChatOpenLink } from '@/components/bdo/BdoChatOpenLink';
import {
  LayoutDashboard,
  FileText,
  Package,
  FileCheck,
  ShoppingCart,
  MessageSquare,
  Settings,
} from 'lucide-react';

const navItems = [
  { href: '/buyer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/buyer/rfqs', label: 'RFQs', icon: FileText },
  { href: '/buyer/products', label: 'Products', icon: Package },
  { href: '/buyer/quotes', label: 'Quotes', icon: FileCheck },
  { href: '/buyer/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/buyer/inquiries', label: 'Inquiries', icon: MessageSquare },
  { href: '/buyer/settings', label: 'Settings', icon: Settings },
];

export function BuyerSidebar() {
  const pathname = usePathname();

  const [first, ...rest] = navItems;

  const renderLink = (item: (typeof navItems)[number]) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
          isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200',
        )}
      >
        <Icon className="w-5 h-5" />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gray-100 border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-1">
        {renderLink(first)}
        <BdoChatOpenLink variant="sidebar" />
        {rest.map((item) => renderLink(item))}
      </nav>
    </aside>
  );
}
