'use client';

import { trpc } from '@/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Store, User, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { BecomeBuyerDialog } from './BecomeBuyerDialog';
import { BecomeSupplierDialog } from './BecomeSupplierDialog';
import { StatusBadge } from './StatusBadge';
import Link from 'next/link';

export function ProfilePage() {
  const { data: session } = trpc.auth.session.useQuery();
  const { data: profileStatus, isLoading, refetch } = trpc.auth.profileStatus.useQuery();
  const [buyerDialogOpen, setBuyerDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);

  const user = session?.user;

  const handleBuyerSuccess = () => {
    setBuyerDialogOpen(false);
    refetch();
  };

  const handleSupplierSuccess = () => {
    setSupplierDialogOpen(false);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const hasNoProfiles = !profileStatus?.hasBuyer && !profileStatus?.hasSupplier;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <p className="text-gray-600 mt-1">
              Manage your account and registration status
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-sm font-medium mt-1">{user?.name || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-sm font-medium mt-1">{user?.email || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Role</label>
                <p className="text-sm font-medium mt-1 capitalize">{user?.role || 'user'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Status */}
        <Card>
          <CardHeader>
            <CardTitle>Registration Status</CardTitle>
            <CardDescription>Your buyer and supplier registration status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Buyer Status */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold">Buyer Profile</h3>
                </div>
                {profileStatus?.hasBuyer && (
                  <StatusBadge status={profileStatus.buyerStatus || 'pending'} />
                )}
              </div>
              {profileStatus?.hasBuyer ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Company: {profileStatus.buyer?.companyName || 'N/A'}
                  </p>
                  {profileStatus.buyerStatus === 'approved' ? (
                    <Link href="/buyer/dashboard">
                      <Button variant="outline" size="sm">
                        Go to Buyer Dashboard
                      </Button>
                    </Link>
                  ) : profileStatus.buyerStatus === 'pending' ? (
                    <div>
                      <p className="text-sm text-yellow-600 mb-2">
                        Your buyer registration is pending approval. You will be notified once approved.
                      </p>
                      <Link href="/buyer/pending">
                        <Button variant="outline" size="sm">
                          View Pending Status
                        </Button>
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Register as a buyer to place orders and access buyer features.
                  </p>
                  <Button
                    onClick={() => setBuyerDialogOpen(true)}
                    className="w-full md:w-auto"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Become a Buyer
                  </Button>
                </div>
              )}
            </div>

            {/* Supplier Status */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold">Supplier Profile</h3>
                </div>
                {profileStatus?.hasSupplier && (
                  <StatusBadge status={profileStatus.supplierStatus || 'pending'} />
                )}
              </div>
              {profileStatus?.hasSupplier ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Company: {profileStatus.supplier?.companyName || 'N/A'}
                  </p>
                  {profileStatus.supplierStatus === 'approved' ? (
                    <Link href="/vendor/dashboard">
                      <Button variant="outline" size="sm">
                        Go to Supplier Dashboard
                      </Button>
                    </Link>
                  ) : profileStatus.supplierStatus === 'pending' ? (
                    <div>
                      <p className="text-sm text-yellow-600 mb-2">
                        Your supplier registration is pending approval. You will be notified once approved.
                      </p>
                      <Link href="/vendor/pending">
                        <Button variant="outline" size="sm">
                          View Pending Status
                        </Button>
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Register as a supplier to list products and manage orders.
                  </p>
                  <Button
                    onClick={() => setSupplierDialogOpen(true)}
                    className="w-full md:w-auto"
                  >
                    <Store className="w-4 h-4 mr-2" />
                    Become a Supplier
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {hasNoProfiles && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="flex justify-center gap-4 mb-6">
                <ShoppingCart className="w-12 h-12 text-gray-400" />
                <Store className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Started</h3>
              <p className="text-gray-600 mb-6">
                Register as a buyer or supplier to access platform features
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => setBuyerDialogOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Become a Buyer
                </Button>
                <Button
                  onClick={() => setSupplierDialogOpen(true)}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Store className="w-4 h-4 mr-2" />
                  Become a Supplier
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <BecomeBuyerDialog
          open={buyerDialogOpen}
          onOpenChange={setBuyerDialogOpen}
          onSuccess={handleBuyerSuccess}
        />
        <BecomeSupplierDialog
          open={supplierDialogOpen}
          onOpenChange={setSupplierDialogOpen}
          onSuccess={handleSupplierSuccess}
        />
      </div>
    </div>
  );
}
