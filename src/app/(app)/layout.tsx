import { Suspense } from 'react';
import { Navbar } from '@/components/navbar/Navbar';
import { Loader2 } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <span className="text-xl font-bold">EvegaSupply</span>
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </nav>
      }>
        <Navbar />
      </Suspense>
      {children}
    </>
  );
}
