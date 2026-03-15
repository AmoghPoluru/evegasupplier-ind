'use client';

import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string | null;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) {
    return <Badge variant="outline">Unknown</Badge>;
  }

  const statusLower = status.toLowerCase();

  if (statusLower === 'pending') {
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
        Pending
      </Badge>
    );
  }

  if (statusLower === 'approved') {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
        Approved
      </Badge>
    );
  }

  if (statusLower === 'rejected') {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
        Rejected
      </Badge>
    );
  }

  if (statusLower === 'suspended') {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
        Suspended
      </Badge>
    );
  }

  return <Badge variant="outline">{status}</Badge>;
}
