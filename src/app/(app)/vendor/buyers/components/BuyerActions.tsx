'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye } from 'lucide-react';
import { BuyerDetailModal } from './BuyerDetailModal';

interface BuyerActionsProps {
  buyerId: string;
  buyerName: string;
  onSuccess?: () => void;
}

export function BuyerActions({
  buyerId,
  buyerName,
  onSuccess,
}: BuyerActionsProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setDetailOpen(true)}>
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BuyerDetailModal
        buyerId={buyerId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
