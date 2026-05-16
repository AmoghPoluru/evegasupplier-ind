import { requireAdmin } from "@/lib/middleware/admin-auth";
import { AdminProductForm } from "../components/AdminProductForm";

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  await requireAdmin();
  const { productId } = await params;
  return (
    <div className="space-y-6">
      <AdminProductForm mode="edit" productId={productId} />
    </div>
  );
}
