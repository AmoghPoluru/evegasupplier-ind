import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'B2B Zvastra - B2B Supplier Marketplace',
  description: 'Ethnic Fusion, Jewellery, Home — B2B supplier marketplace',
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
};

function isPayloadAdminPath(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get('x-pathname') ?? '';

  // Payload CMS `/admin` renders its own document via RootLayout.
  if (isPayloadAdminPath(pathname)) {
    return children;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
