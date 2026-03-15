import { getPayload } from 'payload';
import config from '@payload-config';
import { headers } from 'next/headers';

export interface UserProfileStatus {
  hasBuyer: boolean;
  hasSupplier: boolean;
  buyer: any | null;
  supplier: any | null;
  buyerStatus: string | null;
  supplierStatus: string | null;
}

/**
 * Get user profile status (buyer and supplier)
 * Used in server components to check if user has buyer/supplier profiles
 */
export async function getUserProfileStatus(): Promise<UserProfileStatus> {
  const payload = await getPayload({ config });
  const headersList = await headers();
  
  // Get authenticated user from session
  const { user } = await payload.auth({ headers: headersList });
  
  if (!user) {
    return {
      hasBuyer: false,
      hasSupplier: false,
      buyer: null,
      supplier: null,
      buyerStatus: null,
      supplierStatus: null,
    };
  }

  // Find buyer associated with this user
  const buyersResult = await payload.find({
    collection: 'buyers' as any,
    where: { user: { equals: user.id } },
    limit: 1,
  });

  const buyer = buyersResult.docs[0] ?? null;
  const buyerStatus = buyer
    ? (buyer.verificationStatus || (buyer.verifiedBuyer ? 'approved' : 'pending'))
    : null;

  // Find supplier (vendor) associated with this user
  const vendorsResult = await payload.find({
    collection: 'vendors' as any,
    where: { user: { equals: user.id } },
    limit: 1,
  });

  const supplier = vendorsResult.docs[0] ?? null;
  const supplierStatus = supplier
    ? (supplier.status || (supplier.isActive ? 'approved' : 'pending'))
    : null;

  return {
    hasBuyer: !!buyer,
    hasSupplier: !!supplier,
    buyer,
    supplier,
    buyerStatus,
    supplierStatus,
  };
}
