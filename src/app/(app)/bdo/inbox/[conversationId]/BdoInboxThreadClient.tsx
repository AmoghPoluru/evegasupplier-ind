'use client';

import Link from 'next/link';
import { trpc } from '@/trpc/client';
import { BdoChatMessageList } from '@/components/bdo/BdoChatMessageList';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function BdoInboxThreadClient({ conversationId }: { conversationId: string }) {
  const { data: session } = trpc.auth.session.useQuery();
  const currentUserId =
    session?.user && typeof session.user === 'object' && 'id' in session.user
      ? String((session.user as { id: string }).id)
      : '';

  if (!currentUserId) {
    return <p className="text-sm text-muted-foreground">Loading session…</p>;
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/bdo/dashboard">
          <ArrowLeft className="w-4 h-4 mr-2" />
          All conversations
        </Link>
      </Button>
      <BdoChatMessageList conversationId={conversationId} currentUserId={currentUserId} />
    </div>
  );
}
