import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import { Navbar } from '@/components/navbar/Navbar';
import { Loader2 } from 'lucide-react';
import { TRPCReactProvider } from '@/trpc/client';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TRPCReactProvider>
          <Suspense
            fallback={
              <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                  <span className="text-xl font-bold">EvegaSupply</span>
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              </nav>
            }
          >
            <Navbar />
          </Suspense>
          {children}
          <Toaster />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
