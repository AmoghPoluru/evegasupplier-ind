import { requireVendor } from '@/lib/middleware/vendor-auth';
import { VendorAccountSettingsClient } from './VendorAccountSettingsClient';

export default async function VendorSettingsPage() {
  await requireVendor();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Account settings</h1>
        <p className="text-sm text-gray-600 mt-1">
          Update your supplier profile. Sign-in email cannot be changed here.
        </p>
      </div>

      <VendorAccountSettingsClient />
    </div>
  );
}
