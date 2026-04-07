import { BdoConversationList } from '@/components/bdo/BdoConversationList';

export default function BdoDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-gray-900">Your conversations</h2>
        <p className="mt-1 text-sm text-gray-600">
          All buyer and supplier threads assigned to you as coordinator. Open one to read and reply.
        </p>
      </div>
      <BdoConversationList />
    </div>
  );
}
