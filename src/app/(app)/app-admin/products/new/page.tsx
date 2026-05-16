import { requireAdmin } from "@/lib/middleware/admin-auth";
import { AdminProductForm } from "../components/AdminProductForm";

export default async function AdminNewProductPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <AdminProductForm mode="create" />
    </div>
  );
}
