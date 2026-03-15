/**
 * Utility functions for checking supplier publication status
 */

export interface Supplier {
  status?: string | null;
  isActive?: boolean | null;
}

/**
 * Check if a supplier is published (approved and active)
 * A supplier is considered published when:
 * - status === 'approved'
 * - isActive === true
 */
export function isSupplierPublished(supplier: Supplier | null | undefined): boolean {
  if (!supplier) return false;
  
  return (
    supplier.status === 'approved' &&
    supplier.isActive === true
  );
}

/**
 * Get publication status as a string
 */
export function getSupplierPublicationStatus(supplier: Supplier | null | undefined): 'published' | 'unpublished' | 'unknown' {
  if (!supplier) return 'unknown';
  
  if (isSupplierPublished(supplier)) {
    return 'published';
  }
  
  return 'unpublished';
}
