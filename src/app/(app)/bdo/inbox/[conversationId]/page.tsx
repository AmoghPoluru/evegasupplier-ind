import { BdoInboxThreadClient } from './BdoInboxThreadClient';

export default async function BdoInboxThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <BdoInboxThreadClient conversationId={conversationId} />;
}
