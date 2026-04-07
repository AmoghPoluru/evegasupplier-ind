import { getVendorStatus } from '@/lib/middleware/vendor-auth';
import { VendorSidebar } from './components/VendorSidebar';
import { VendorHeader } from './components/VendorHeader';
import { BdoChatFloating } from '@/components/bdo/BdoChatFloating';

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check vendor status without redirecting
  const status = await getVendorStatus();

  // If no vendor or not active, show pending/suspended pages without sidebar/header
  if (!status.hasVendor || !status.isActive) {
    return <>{children}</>;
  }

  // For active vendors, show full dashboard layout
  return (
    <div className="min-h-screen bg-gray-50">
      <VendorHeader />
      <div className="flex pt-16">
        <VendorSidebar />
        <main className="flex-1 p-6 ml-64">
          {children}
        </main>
      </div>
      <BdoChatFloating profileKind="vendor" />
    </div>
  );
}
