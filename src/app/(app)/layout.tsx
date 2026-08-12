import { Suspense } from 'react';
import { ConditionalNavbar } from '@/components/navbar/ConditionalNavbar';
import { Loader2 } from 'lucide-react';
import { TRPCReactProvider } from '@/trpc/client';
import { Toaster } from '@/components/ui/sonner';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
        <ConditionalNavbar />
      </Suspense>
      {children}
      <Toaster />
    </TRPCReactProvider>
  );
}
