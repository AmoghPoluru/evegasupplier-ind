'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { trpc } from '@/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/** Poll while the dashboard is open (~1s) so unread highlight updates quickly when counterparty sends. */
const LIST_POLL_MS = 1000;

export function BdoConversationList() {
  const { data, isLoading, error, refetch } = trpc.chat.listConversationsForBdo.useQuery(undefined, {
    refetchInterval: LIST_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refetch();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [refetch]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading conversations…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">{error.message ?? 'Could not load conversations'}</p>
    );
  }

  const list = data?.conversations ?? [];

  if (list.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No conversations yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          When buyers or suppliers message you from their dashboards, threads will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((c: any) => {
        const unread = Boolean(c.hasUnreadForBdo);
        const title =
          c.profileKind === 'buyer'
            ? (typeof c.buyer === 'object' && c.buyer?.companyName) || 'Buyer'
            : (typeof c.vendor === 'object' && c.vendor?.companyName) || 'Supplier';
        const kind = c.profileKind === 'buyer' ? 'Buyer' : 'Supplier';
        return (
          <Link key={c.id} href={`/bdo/inbox/${c.id}`}>
            <Card
              className={
                unread
                  ? 'border-amber-300 bg-amber-50/90 transition-colors hover:border-amber-400 dark:border-amber-700 dark:bg-amber-950/35'
                  : 'transition-colors hover:border-primary/40'
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{title}</CardTitle>
                  <div className="flex shrink-0 items-center gap-2">
                    {unread && (
                      <Badge className="bg-amber-600 text-white hover:bg-amber-600">Unread</Badge>
                    )}
                    <Badge variant="secondary">{kind}</Badge>
                  </div>
                </div>
                <CardDescription>
                  {c.lastMessageAt
                    ? `Last activity: ${new Date(c.lastMessageAt).toLocaleString()}`
                    : 'No messages yet'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <span className="text-sm text-primary">Open thread →</span>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
