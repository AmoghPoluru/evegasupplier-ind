import { getVendorStatus } from '@/lib/middleware/vendor-auth';
import { VendorSidebar } from './components/VendorSidebar';
import { VendorHeader } from './components/VendorHeader';

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = await getVendorStatus();

  if (!status.hasVendor || !status.isActive) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorHeader />
      <div className="flex pt-16">
        <VendorSidebar />
        <main className="flex-1 p-6 ml-64">
          {children}
        </main>
      </div>
    </div>
  );
}
