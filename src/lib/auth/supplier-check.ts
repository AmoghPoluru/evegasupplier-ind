import { getPayload } from 'payload';
import config from '@payload-config';

/**
 * Check if a user is a supplier (vendor) in eVega
 * This queries the shared database to check if user has an active vendor profile
 * 
 * Note: This assumes vendors collection exists in the same database.
 * If vendors are in a separate eVega database, you'll need to:
 * 1. Query via API endpoint (EVEGA_API_URL)
 * 2. Or use shared database connection
 */
export async function checkIfSupplier(userId: string): Promise<boolean> {
  try {
    const payload = await getPayload({ config });
    
    // First, check if vendors collection exists in this database
    // If not, try to query via API (if EVEGA_API_URL is set)
    const evegaApiUrl = process.env.EVEGA_API_URL;
    
    if (evegaApiUrl) {
      // Query eVega API for vendor status
      try {
        const response = await fetch(`${evegaApiUrl}/api/vendors/by-user/${userId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.EVEGA_API_KEY || ''}`,
          },
        });
        
        if (response.ok) {
          const vendor = await response.json();
          return vendor?.isActive === true && vendor?.status === 'approved';
        }
      } catch (apiError) {
        console.warn('Failed to query eVega API, falling back to local check:', apiError);
      }
    }
    
    // Fallback: Query local vendors collection (if shared database)
    try {
      const vendorsResult = await payload.find({
        collection: 'vendors' as any,
        where: {
          user: { equals: userId },
          isActive: { equals: true },
        },
        limit: 1,
      });

      const vendor = vendorsResult.docs[0];
      
      if (!vendor) {
        return false;
      }

      // Check if vendor is approved (if status field exists)
      const status = (vendor as any).status;
      const isApproved = status === 'approved' || status === undefined; // Default to approved if status not set

      return isApproved;
    } catch (collectionError) {
      // Vendors collection might not exist in this database
      console.warn('Vendors collection not found in local database. Ensure shared database or API is configured.');
      return false;
    }
  } catch (error) {
    console.error('Error checking supplier status:', error);
    // On error, return false for security (fail closed)
    return false;
  }
}

/**
 * Get vendor ID for a user if they are a supplier
 */
export async function getVendorIdForUser(userId: string): Promise<string | null> {
  try {
    const payload = await getPayload({ config });
    
    const vendorsResult = await payload.find({
      collection: 'vendors' as any,
      where: {
        user: { equals: userId },
        isActive: { equals: true },
      },
      limit: 1,
    });

    const vendor = vendorsResult.docs[0];
    return vendor?.id || null;
  } catch (error) {
    console.error('Error getting vendor ID:', error);
    return null;
  }
}
