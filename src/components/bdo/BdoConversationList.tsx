'use client';

import Link from 'next/link';
import { trpc } from '@/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function BdoConversationList() {
  const { data, isLoading, error } = trpc.chat.listConversationsForBdo.useQuery();

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
        const title =
          c.profileKind === 'buyer'
            ? (typeof c.buyer === 'object' && c.buyer?.companyName) || 'Buyer'
            : (typeof c.vendor === 'object' && c.vendor?.companyName) || 'Supplier';
        const kind = c.profileKind === 'buyer' ? 'Buyer' : 'Supplier';
        return (
          <Link key={c.id} href={`/bdo/inbox/${c.id}`}>
            <Card className="transition-colors hover:border-primary/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{title}</CardTitle>
                  <Badge variant="secondary">{kind}</Badge>
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
