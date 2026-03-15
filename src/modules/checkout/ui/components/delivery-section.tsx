'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';

export function DeliverySection() {
  // Simplified for now - can be enhanced to fetch user addresses
  const defaultAddress = {
    fullName: 'Customer Name',
    street: '123 Main Street',
    city: 'City',
    state: 'State',
    zipcode: '12345',
    phone: '123-456-7890',
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Delivering to {defaultAddress.fullName}
          </h2>
          {defaultAddress ? (
            <div className="space-y-1 text-sm text-gray-700">
              <p>{defaultAddress.street}</p>
              <p>
                {defaultAddress.city}, {defaultAddress.state} {defaultAddress.zipcode}
              </p>
              <p>{defaultAddress.phone}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">No address on file</p>
          )}
        </div>
        <Link
          href="/buyer/settings?tab=addresses"
          className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
        >
          Change
        </Link>
      </div>
    </div>
  );
}
