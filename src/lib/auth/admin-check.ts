import type { User } from '@/payload-types';

/**
 * Check if a user is an admin
 * Checks both the role field and any admin-related roles
 */
export function checkIfAdmin(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }

  // Check role field
  const role = (user as any).role;
  if (role === 'admin') {
    return true;
  }

  // Check if user has admin role in roles relationship (if exists)
  // Adjust based on your actual user structure
  const roles = (user as any).roles;
  if (Array.isArray(roles)) {
    return roles.some((r: any) => {
      const roleSlug = typeof r === 'object' ? r.slug : r;
      return roleSlug === 'admin' || roleSlug === 'super-admin';
    });
  }

  return false;
}
