import { getBuyerStatus } from '@/lib/middleware/buyer-auth';
import { BuyerSidebar } from './components/BuyerSidebar';
import { BuyerHeader } from './components/BuyerHeader';
import { BdoChatFloating } from '@/components/bdo/BdoChatFloating';

export default async function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check buyer status without redirecting
  const status = await getBuyerStatus();

  // If no buyer or not active, show pending/suspended pages without sidebar/header
  if (!status.hasBuyer || !status.isActive) {
    return <>{children}</>;
  }

  // For active buyers, show full dashboard layout
  return (
    <div className="min-h-screen bg-gray-50">
      <BuyerHeader />
      <div className="flex pt-16">
        <BuyerSidebar />
        <main className="flex-1 p-6 ml-64">
          {children}
        </main>
      </div>
      <BdoChatFloating profileKind="buyer" />
    </div>
  );
}
