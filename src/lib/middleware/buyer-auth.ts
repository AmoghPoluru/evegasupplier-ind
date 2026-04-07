import { getPayload } from 'payload';
import config from '@payload-config';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export interface BuyerStatus {
  hasBuyer: boolean;
  buyer: any | null;
  status: 'approved' | 'pending' | 'suspended' | null;
  isActive: boolean;
}

/**
 * Get buyer status for the current authenticated user
 * Used in server components to check buyer access
 */
export async function getBuyerStatus(): Promise<BuyerStatus> {
  const payload = await getPayload({ config });
  const headersList = await headers();
  
  // Get authenticated user from session
  const { user } = await payload.auth({ headers: headersList });
  
  if (!user) {
    return {
      hasBuyer: false,
      buyer: null,
      status: null,
      isActive: false,
    };
  }

  // Find buyer associated with this user
  const buyersResult = await payload.find({
    collection: 'buyers' as any,
    where: { user: { equals: user.id } },
    limit: 1,
    depth: 1,
  });

  const buyer = buyersResult.docs[0] ?? null;

  if (!buyer) {
    return {
      hasBuyer: false,
      buyer: null,
      status: null,
      isActive: false,
    };
  }

  // Check buyer status
  // Use verifiedBuyer as the approval status
  const isVerified = buyer.verifiedBuyer === true;
  const isArchived = buyer.isArchived === true;
  const isActive = !isArchived && isVerified;

  return {
    hasBuyer: true,
    buyer,
    status: isVerified ? 'approved' : 'pending',
    isActive: isActive && isVerified,
  };
}

/**
 * Require buyer access - throws error or redirects if user doesn't have buyer
 * Use in server components to protect buyer routes
 */
export async function requireBuyer(): Promise<any> {
  const status = await getBuyerStatus();

  if (!status.hasBuyer) {
    redirect('/buyer/pending');
  }

  if (status.status !== 'approved' || !status.isActive) {
    if (status.status === 'pending') {
      redirect('/buyer/pending');
    } else {
      redirect('/buyer/suspended');
    }
  }

  return status.buyer;
}
