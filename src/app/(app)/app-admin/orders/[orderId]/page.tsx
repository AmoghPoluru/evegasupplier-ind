import { requireAdmin } from '@/lib/middleware/admin-auth';
import { AdminOrderDetail } from './components/AdminOrderDetail';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  await requireAdmin();
  const { orderId } = await params;

  return <AdminOrderDetail orderId={orderId} />;
}
