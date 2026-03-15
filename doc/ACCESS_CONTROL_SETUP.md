# Access Control Setup Guide - ❌ DEPRECATED

> **⚠️ This document is deprecated. All access control functionality has been removed.**
> 
> **Status**: eVega Suppliers no longer enforces access control based on eVega referrer/token. The middleware now allows all access.

This document is kept for reference only. Do not implement any of the access control described here.

# Access Control Setup Guide

This guide explains how to configure and use the access control system for eVega Suppliers.

## Overview

The access control system enforces that **eVega Suppliers is only accessible from eVega**, except for:
- ✅ **Suppliers (Vendors)**: Can access directly
- ✅ **Admins**: Can access directly
- ❌ **Regular Users**: Must access through eVega

## Configuration

### Environment Variables

Add these to your `.env.local` or production environment:

```env
# eVega Integration
EVEGA_URL=https://evega.com
EVEGA_DOMAIN=evega.com
EVEGA_API_URL=https://api.evega.com  # Optional: if vendors are in separate database
EVEGA_API_KEY=your_api_key_here      # Optional: for API authentication
EVEGA_TOKEN_SECRET=your_shared_secret  # For token validation (can use PAYLOAD_SECRET)

# Shared Database (if using same database)
DATABASE_URL=mongodb://...  # Same as eVega
PAYLOAD_SECRET=...          # Same as eVega (for shared sessions)
```

### Access Control Flow

1. **User visits eVega Suppliers**
2. **Middleware checks**:
   - Is user a supplier? → ✅ Allow
   - Is user an admin? → ✅ Allow
   - Is referrer from eVega? → ✅ Allow
   - Has valid eVega token? → ✅ Allow
   - Otherwise → ❌ Redirect to eVega

## Implementation Details

### Files Created

1. **`src/lib/auth/supplier-check.ts`**
   - Checks if user is a supplier (vendor)
   - Queries vendors collection or eVega API

2. **`src/lib/auth/admin-check.ts`**
   - Checks if user is an admin
   - Validates user role

3. **`src/lib/auth/evega-token-validator.ts`**
   - Validates tokens from eVega
   - Checks referrer headers
   - Token signature validation

4. **`src/lib/middleware/access-control.ts`**
   - Main access control logic
   - Returns access decision with reason

5. **`src/middleware.ts`**
   - Next.js middleware
   - Applies access control to all routes
   - Handles redirects

6. **`src/app/(app)/access-denied/page.tsx`**
   - User-friendly access denied page
   - Explains access requirements

### Public Routes

These routes are excluded from access control:
- `/api/auth/*` - Authentication endpoints
- `/api/webhooks/*` - Webhook endpoints
- `/api/trpc/*` - tRPC endpoints
- `/admin` - Payload admin (has its own auth)
- `/sign-in`, `/sign-up` - Auth pages
- `/access-denied` - Access denied page
- Static files (`/_next/*`, `/favicon.ico`, etc.)

## Usage

### For Suppliers

Suppliers can access eVega Suppliers directly:
1. Log in with supplier credentials
2. Access any page directly
3. No redirect required

### For Admins

Admins can access eVega Suppliers directly:
1. Log in with admin credentials
2. Full access to all features
3. No redirect required

### For Regular Users

Regular users must access through eVega:
1. Go to `https://evega.com/suppliers`
2. Click "Go to Supplier Marketplace"
3. Redirected to eVega Suppliers with session token
4. Can browse and use marketplace

### From eVega Integration

In eVega, add a link to Supplier Marketplace:

```tsx
// In eVega vendor dashboard
<Link href={`https://suppliers.evega.com?token=${sessionToken}`}>
  Go to Supplier Marketplace
</Link>
```

Or use referrer-based approach (simpler):

```tsx
<Link href="https://suppliers.evega.com">
  Go to Supplier Marketplace
</Link>
```

## Testing

### Test Scenarios

1. **Supplier Direct Access**
   - Log in as supplier
   - Visit `https://suppliers.evega.com` directly
   - Should work ✅

2. **Admin Direct Access**
   - Log in as admin
   - Visit `https://suppliers.evega.com` directly
   - Should work ✅

3. **Regular User from eVega**
   - Log in to eVega
   - Click "Supplier Marketplace" link
   - Should work ✅

4. **Regular User Direct Access**
   - Log in as regular user
   - Visit `https://suppliers.evega.com` directly
   - Should redirect to eVega ❌

5. **Unauthenticated User**
   - Not logged in
   - Visit `https://suppliers.evega.com`
   - Should redirect to eVega sign-in ❌

## Troubleshooting

### Issue: Suppliers can't access directly

**Solution**: 
- Check if `vendors` collection exists in database
- Verify `checkIfSupplier()` function is working
- Check database connection

### Issue: Users redirected even from eVega

**Solution**:
- Verify `EVEGA_DOMAIN` is set correctly
- Check referrer header is being passed
- Ensure cookies are shared (if same domain)

### Issue: Token validation failing

**Solution**:
- Verify `EVEGA_TOKEN_SECRET` matches between systems
- Check token format and expiration
- Review token generation in eVega

## Security Considerations

1. **Fail Closed**: On errors, access is denied (secure by default)
2. **Token Validation**: Uses HMAC SHA-256 for signature validation
3. **Audit Logging**: All access decisions are logged
4. **Rate Limiting**: Consider adding rate limiting for access checks

## Next Steps

1. Configure environment variables
2. Test access control with different user types
3. Add "Go to Supplier Marketplace" link in eVega
4. Monitor access logs for issues
5. Adjust rules as needed based on business requirements
