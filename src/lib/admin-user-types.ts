export type AdminUserRole = 'user' | 'vendor' | 'buyer' | 'admin' | 'bdo';

export type AdminUserView = {
  id: string;
  email: string;
  name?: string | null;
  role: AdminUserRole;
  oauthProvider?: 'email' | 'google' | 'facebook' | null;
  createdAt: string;
  updatedAt: string;
  hasSupplierProfile?: boolean;
  hasBuyerProfile?: boolean;
  supplierProfile?: Record<string, unknown> | null;
  buyerProfile?: Record<string, unknown> | null;
};

export function toAdminUserView(user: {
  id: string;
  email: string;
  name?: string | null;
  role: AdminUserRole;
  oauthProvider?: 'email' | 'google' | 'facebook' | null;
  createdAt: string;
  updatedAt: string;
}): AdminUserView {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    role: user.role,
    oauthProvider: user.oauthProvider ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
