'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone } from 'lucide-react';

interface PhoneInputSectionProps {
  phoneNumber: string;
  onPhoneChange: (phone: string) => void;
}

export function PhoneInputSection({ phoneNumber, onPhoneChange }: PhoneInputSectionProps) {
  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
      <div>
        <Label htmlFor="customer-phone" className="text-sm font-medium text-gray-700 mb-1 block">
          Your Phone Number <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="customer-phone"
            type="tel"
            placeholder="Enter your phone number"
            value={phoneNumber}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="pl-10"
            required
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          The supplier will contact you at this number to complete the payment
        </p>
      </div>
    </div>
  );
}
