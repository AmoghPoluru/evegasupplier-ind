import { getBuyerStatus } from '@/lib/middleware/buyer-auth';
import { BuyerSidebar } from './components/BuyerSidebar';
import { BuyerHeader } from './components/BuyerHeader';

export default async function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = await getBuyerStatus();

  if (!status.hasBuyer || !status.isActive) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BuyerHeader />
      <div className="flex pt-16">
        <BuyerSidebar />
        <main className="flex-1 p-6 ml-64">
          {children}
        </main>
      </div>
    </div>
  );
}
