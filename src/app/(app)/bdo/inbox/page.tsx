import { redirect } from 'next/navigation';

/** Old URL `/bdo/inbox` redirects to the dashboard list. */
export default function BdoInboxRedirectPage() {
  redirect('/bdo/dashboard');
}
