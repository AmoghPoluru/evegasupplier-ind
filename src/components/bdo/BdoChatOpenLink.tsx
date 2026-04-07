'use client';

import { MessageCircle } from 'lucide-react';

/** Opens the same chat as the floating FAB (`#bdo-chat-trigger`). */
export function BdoChatOpenLink() {
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
