import { getPayload } from 'payload';
import config from '@payload-config';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function BdoLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });

  if (!user) {
    redirect('/login');
  }

  const role = (user as { role?: string }).role;
  if (role !== 'bdo' && role !== 'admin') {
    redirect('/');
  }

  const email = (user as { email?: string }).email;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Coordinator dashboard</h1>
            <p className="text-sm text-gray-600">Chats with buyers and suppliers assigned to you</p>
            {email ? <p className="mt-1 text-xs text-gray-500">{email}</p> : null}
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/bdo/dashboard" className="font-medium text-primary hover:underline">
              Conversations
            </Link>
            <Link href="/?browse=1" className="text-gray-600 hover:text-gray-900">
              Marketplace
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl p-6">{children}</div>
    </div>
  );
}
