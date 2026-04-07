'use client';

import { useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/trpc/client';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MessageCircle, X } from 'lucide-react';
import { BdoChatMessageList } from './BdoChatMessageList';

export function BdoChatFloating({ profileKind }: { profileKind: 'buyer' | 'vendor' }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [bootMessage, setBootMessage] = useState<string | null>(null);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  const { data: session, isLoading: sessionLoading } = trpc.auth.session.useQuery();
  const currentUserId =
    session?.user && typeof session.user === 'object' && 'id' in session.user
      ? String((session.user as { id: string }).id)
      : '';

  const ensure = trpc.chat.ensureConversation.useMutation({
    onSuccess: (data) => {
      if (data.ok && data.conversation) {
        setConversationId((data.conversation as { id: string }).id);
        setBootMessage(null);
        return;
      }
      if (!data.ok) {
        if (data.reason === 'no_bdo') {
          setBootMessage('No coordinator is assigned to your account yet. Please contact support.');
        } else if (data.reason === 'no_profile') {
          setBootMessage(
            profileKind === 'buyer'
              ? 'No buyer profile found for your account.'
              : 'No supplier profile found for your account.',
          );
        } else {
          setBootMessage('Could not start chat.');
        }
      }
    },
    onError: (err) => {
      setBootMessage(err.message ?? 'Could not start chat.');
    },
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && !conversationId && !ensure.isPending) {
      setBootMessage(null);
      ensure.mutate({ profileKind });
    }
  };

  const sheet = (
    <>
      {open && <div className="fixed inset-0 z-[105] bg-black/50" aria-hidden />}
      <Sheet modal={false} open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          <Button
            id="bdo-chat-trigger"
            type="button"
            size="lg"
            className="fixed bottom-6 right-6 z-[100] h-14 w-14 rounded-full shadow-lg"
            aria-label="Chat with your BDO"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full sm:max-w-lg flex flex-col z-[110]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="pointer-events-auto flex min-h-0 flex-1 flex-col">
            <SheetHeader className="flex flex-row items-start gap-3 space-y-0 p-4 pb-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <SheetTitle>Chat with your coordinator</SheetTitle>
                <SheetDescription>
                  Messages go to your assigned BDO. This updates every few seconds; wire Pusher later for instant
                  delivery.
                </SheetDescription>
              </div>
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-foreground hover:bg-muted"
                  aria-label="Close chat"
                >
                  <X className="size-5" />
                </Button>
              </SheetClose>
            </SheetHeader>
            <div className="mt-4 flex min-h-0 flex-1 flex-col px-4 pb-4">
              {ensure.isPending && !conversationId && (
                <p className="text-sm text-muted-foreground">Starting conversation…</p>
              )}
              {bootMessage && (
                <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                  {bootMessage}
                </p>
              )}
              {conversationId && currentUserId && (
                <BdoChatMessageList conversationId={conversationId} currentUserId={currentUserId} />
              )}
              {conversationId && !currentUserId && sessionLoading && (
                <p className="text-sm text-muted-foreground">Loading your session…</p>
              )}
              {conversationId && !currentUserId && !sessionLoading && (
                <p className="text-sm text-destructive">
                  Could not resolve your user id for chat. Try refreshing the page.
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );

  if (!mounted) {
    return null;
  }

  return createPortal(sheet, document.body);
}
