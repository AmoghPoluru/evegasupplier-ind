'use client';

import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/trpc/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function BdoChatMessageList({
  conversationId,
  currentUserId,
}: {
  conversationId: string;
  currentUserId: string;
}) {
  const utils = trpc.useUtils();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');

  const { data, isLoading } = trpc.chat.listMessages.useQuery(
    { conversationId },
    {
      refetchInterval: 3000,
    },
  );

  const send = trpc.chat.sendMessage.useMutation({
    onSuccess: async (result) => {
      const newDoc = result.message;
      utils.chat.listMessages.setData({ conversationId }, (old) => {
        if (!old?.messages) {
          return { messages: [newDoc] };
        }
        const exists = old.messages.some((m) => m.id === newDoc.id);
        if (exists) return old;
        return { messages: [...old.messages, newDoc] };
      });
      setText('');
      await utils.chat.listMessages.refetch({ conversationId });
    },
  });

  const messages = data?.messages ?? [];

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleSend = () => {
    const body = text.trim();
    if (!body || send.isPending) return;
    send.mutate({ conversationId, body });
  };

  return (
    <div className="pointer-events-auto flex min-h-0 flex-col gap-3">
      <div className="min-h-[200px] max-h-[min(420px,50vh)] overflow-y-auto border rounded-md p-3 bg-muted/30">
        <div className="space-y-3 pr-1">
          {isLoading && messages.length === 0 && (
            <p className="text-sm text-muted-foreground">Loading messages…</p>
          )}
          {!isLoading && messages.length === 0 && (
            <p className="text-sm text-muted-foreground">No messages yet. Say hello to your coordinator.</p>
          )}
          {messages.map((m: any) => {
            const senderId = String(
              typeof m.sender === 'object' && m.sender?.id != null ? m.sender.id : m.sender,
            );
            const isMine = senderId === String(currentUserId);
            const preview =
              typeof m.sender === 'object' && m.sender?.name
                ? (m.sender as { name?: string }).name
                : 'User';
            return (
              <div
                key={m.id}
                className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    isMine ? 'bg-blue-600 text-white' : 'bg-background border shadow-sm',
                  )}
                >
                  {!isMine && (
                    <p className="text-xs opacity-80 mb-1 font-medium">{preview}</p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  {m.createdAt && (
                    <p
                      className={cn(
                        'text-[10px] mt-1 opacity-70',
                        isMine ? 'text-blue-100' : 'text-muted-foreground',
                      )}
                    >
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="min-h-[80px] resize-none"
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          type="button"
          className="self-end"
          disabled={send.isPending || !text.trim()}
          onClick={handleSend}
        >
          Send
        </Button>
      </div>
      {send.isError && (
        <p className="text-sm text-destructive mt-2">{send.error?.message ?? 'Failed to send'}</p>
      )}
    </div>
  );
}
