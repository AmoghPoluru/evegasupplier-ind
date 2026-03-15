'use client';

import { trpc } from '@/trpc/client';
import { checkIfAdmin } from '@/lib/auth/admin-check';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, User, X } from 'lucide-react';
import { useState } from 'react';

export function AdminDebugBanner() {
  const { data: session, isLoading } = trpc.auth.session.useQuery();
  const [isDismissed, setIsDismissed] = useState(false);
  
  const sessionUser = session?.user;
  const userRole = sessionUser ? ((sessionUser as any).role) : null;
  const isAdmin = sessionUser ? checkIfAdmin(sessionUser as any) : false;
  
  if (isDismissed || isLoading || !sessionUser) {
    return null;
  }
  
  return (
    <Alert className="mb-4 border-2 bg-blue-50 relative">
      <Shield className="w-5 h-5" />
      <div className="flex-1">
        <div className="flex items-start justify-between mb-2">
          <AlertTitle className="flex items-center gap-2 text-lg font-bold">
            Admin Status Debug
          </AlertTitle>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <AlertDescription className="space-y-1">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <strong>Email:</strong> {(sessionUser as any).email || 'N/A'}
              </div>
              <div>
                <strong>User ID:</strong> {sessionUser.id || 'N/A'}
              </div>
              <div>
                <strong>Role Field:</strong> 
                <span className={`ml-2 font-bold ${userRole === 'admin' ? 'text-green-600' : 'text-red-600'}`}>
                  {userRole || 'NOT SET'}
                </span>
              </div>
              <div>
                <strong>Is Admin:</strong> 
                <span className={`ml-2 font-bold ${isAdmin ? 'text-green-600' : 'text-red-600'}`}>
                  {isAdmin ? 'YES ✅' : 'NO ❌'}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <strong>Full User Object:</strong>
              <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(sessionUser, null, 2)}
              </pre>
            </div>
            {!isAdmin && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-semibold text-red-600">
                  ⚠️ To make this user an admin:
                </p>
                <ol className="text-xs mt-1 ml-4 list-decimal">
                  <li>Go to <code className="bg-gray-200 px-1 rounded">/admin/collections/users</code> (Payload CMS admin)</li>
                  <li>Find user with email: <strong>{(sessionUser as any).email}</strong></li>
                  <li>Edit the user</li>
                  <li>Set "Role" field to <strong>"Admin"</strong></li>
                  <li>Save and refresh this page</li>
                </ol>
              </div>
            )}
        </AlertDescription>
      </div>
    </Alert>
  );
}
