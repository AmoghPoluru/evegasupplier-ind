import type { Payload } from 'payload';

export type VendorAccountMirror = {
  accountName: string;
  accountEmail: string;
  oauthProvider: 'email' | 'google' | 'facebook';
};

export async function getVendorMirrorFromUser(
  payload: Payload,
  userId: string,
): Promise<VendorAccountMirror | null> {
  const user = await payload.findByID({
    collection: 'users',
    id: userId,
    depth: 0,
  });
  if (!user) return null;
  const u = user as {
    name?: string | null;
    email?: string | null;
    oauthProvider?: string | null;
  };
  const oauth = u.oauthProvider;
  const oauthProvider: VendorAccountMirror['oauthProvider'] =
    oauth === 'google' || oauth === 'facebook' ? oauth : 'email';
  return {
    accountName: (u.name ?? '').trim(),
    accountEmail: (u.email ?? '').trim(),
    oauthProvider,
  };
}

/**
 * Push user identity onto every vendor row linked to this user (users remains source of truth).
 */
export async function syncAllVendorProfilesForUser(
  payload: Payload,
  userId: string,
  userSnapshot?: { name?: string | null; email?: string | null; oauthProvider?: string | null },
): Promise<void> {
  const mirror = userSnapshot
    ? (() => {
        const oauth = userSnapshot.oauthProvider;
        const oauthProvider: VendorAccountMirror['oauthProvider'] =
          oauth === 'google' || oauth === 'facebook' ? oauth : 'email';
        return {
          accountName: (userSnapshot.name ?? '').trim() || '—',
          accountEmail: (userSnapshot.email ?? '').trim(),
          oauthProvider,
        };
      })()
    : await getVendorMirrorFromUser(payload, userId);
  if (!mirror) return;

  const vendors = await payload.find({
    collection: 'vendors',
    where: { user: { equals: userId } },
    limit: 100,
  });

  for (const v of vendors.docs) {
    await payload.update({
      collection: 'vendors',
      id: v.id,
      data: {
        accountName: mirror.accountName,
        accountEmail: mirror.accountEmail,
        oauthProvider: mirror.oauthProvider,
      },
      overrideAccess: true,
    });
  }
}

/** One-time / maintenance: refresh mirrors for every vendor from linked user. */
export async function backfillVendorAccountMirrors(payload: Payload): Promise<void> {
  const vendors = await payload.find({
    collection: 'vendors',
    limit: 2000,
  });
  const seen = new Set<string>();
  for (const v of vendors.docs) {
    const userRef = (v as { user?: string | { id?: string } }).user;
    const userId = typeof userRef === 'string' ? userRef : userRef?.id;
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    await syncAllVendorProfilesForUser(payload, userId);
  }
}
