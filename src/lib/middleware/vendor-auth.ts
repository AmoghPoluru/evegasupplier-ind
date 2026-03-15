import { getPayload } from 'payload';
import config from '@payload-config';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export interface VendorStatus {
  hasVendor: boolean;
  vendor: any | null;
  status: 'approved' | 'pending' | 'suspended' | null;
  isActive: boolean;
}

/**
 * Get vendor status for the current authenticated user
 * Used in server components to check vendor access
 */
export async function getVendorStatus(): Promise<VendorStatus> {
  const payload = await getPayload({ config });
  const headersList = await headers();
  
  // Get authenticated user from session
  const { user } = await payload.auth({ headers: headersList });
  
  if (!user) {
    return {
      hasVendor: false,
      vendor: null,
      status: null,
      isActive: false,
    };
  }

  // Find vendor associated with this user
  const vendorsResult = await payload.find({
    collection: 'vendors',
    where: { user: { equals: user.id } },
    limit: 1,
  });

  const vendor = vendorsResult.docs[0] ?? null;

  if (!vendor) {
    return {
      hasVendor: false,
      vendor: null,
      status: null,
      isActive: false,
    };
  }

  // Check vendor status
  // Use status field ('pending', 'approved', 'rejected', 'suspended')
  // and isActive field to determine vendor access
  // Backward compatibility: if status is null/undefined, check verifiedSupplier field
  let vendorStatus = (vendor as any).status;
  const vendorIsActive = (vendor as any).isActive === true;
  
  // Backward compatibility: if status is not set, use verifiedSupplier to determine status
  if (!vendorStatus || vendorStatus === null || vendorStatus === undefined) {
    const verifiedSupplier = (vendor as any).verifiedSupplier === true;
    vendorStatus = verifiedSupplier ? 'approved' : 'pending';
  }
  
  // Determine status for return value
  let status: 'approved' | 'pending' | 'suspended' | null = null;
  if (vendorStatus === 'approved' && vendorIsActive) {
    status = 'approved';
  } else if (vendorStatus === 'suspended') {
    status = 'suspended';
  } else {
    status = 'pending';
  }

  return {
    hasVendor: true,
    vendor,
    status,
    isActive: vendorStatus === 'approved' && vendorIsActive,
  };
}

/**
 * Require vendor access - throws error or redirects if user doesn't have vendor
 * Use in server components to protect vendor routes
 */
export async function requireVendor(): Promise<any> {
  const status = await getVendorStatus();

  if (!status.hasVendor) {
    redirect('/vendor/pending');
  }

  if (status.status !== 'approved' || !status.isActive) {
    if (status.status === 'pending') {
      redirect('/vendor/pending');
    } else {
      redirect('/vendor/suspended');
    }
  }

  return status.vendor;
}
