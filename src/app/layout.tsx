import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EvegaSupply - B2B Supplier Marketplace',
  description: 'B2B supplier marketplace platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
