'use client';

import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type BdoChatOpenLinkProps = {
  /** Matches left nav row style (vendor/buyer sidebar). */
  variant?: 'default' | 'sidebar';
};

/** Opens the same chat as the floating FAB (`#bdo-chat-trigger`). */
export function BdoChatOpenLink({ variant = 'default' }: BdoChatOpenLinkProps) {
  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full text-left',
          'text-gray-700 hover:bg-gray-200',
        )}
        onClick={() => document.getElementById('bdo-chat-trigger')?.click()}
      >
        <MessageCircle className="w-5 h-5 shrink-0" />
        Chat with your coordinator
      </button>
    );
  }

  return (
    <button
      type="button"
      className="flex items-center gap-2 text-sm text-blue-600 hover:underline text-left w-full"
      onClick={() => document.getElementById('bdo-chat-trigger')?.click()}
    >
      <MessageCircle className="h-4 w-4 shrink-0" />
      Chat with your coordinator
    </button>
  );
}
