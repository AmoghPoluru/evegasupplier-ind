'use client';

import { toast } from 'sonner';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShoppingCart, X } from 'lucide-react';
import Link from 'next/link';
import { trpc } from '@/trpc/client';
import { useCartStore } from '@/stores/cart-store';
import { DeliverySection } from '../components/delivery-section';
import { PhoneInputSection } from '../components/phone-input-section';
import { OrderSummary } from '../components/order-summary';

export function CheckoutView() {
  const router = useRouter();
  const { items, removeItem, clearCart } = useCartStore();
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  
  const productIds = Array.from(new Set(items.map((item) => item.productId)));
  
  const { data, error, isLoading } = trpc.checkout.getProducts.useQuery({
    ids: productIds.length > 0 ? productIds : [],
  });

  // Check if user has a shipping address (simplified - can be enhanced)
  // For now, we'll assume address is available - can be enhanced later
  const hasShippingAddress = true; // Simplified for now - can check user addresses later

  const createOrder = trpc.checkout.createOrder.useMutation({
    onSuccess: (data) => {
      toast.success('Order placed! Please contact supplier to complete payment.');
      clearCart();
      router.push(`/buyer/orders/${data.orderId}?payment=pending`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to place order. Please try again.');
    },
  });

  useEffect(() => {
    if (error?.data?.code === 'NOT_FOUND') {
      clearCart();
      toast.warning('Some products in your cart are invalid or out of stock, cart cleared.');
    }
  }, [error, clearCart]);

  // Calculate totals
  const orderItems = useMemo(() => {
    if (!data?.docs) return [];
    return items.map((cartItem) => {
      const product = data.docs.find((p: any) => p.id === cartItem.productId);
      if (!product) return null;
      return {
        productId: cartItem.productId,
        name: product.title,
        price: cartItem.product.unitPrice,
        quantity: cartItem.quantity,
      };
    }).filter(Boolean) as Array<{
      productId: string;
      name: string;
      price: number;
      quantity: number;
    }>;
  }, [items, data?.docs]);

  const subtotal = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shipping = subtotal >= 75 ? 0 : 2.99; // Free shipping over $75
  const tax = subtotal * 0.08; // 8% tax (placeholder)
  const total = subtotal + shipping + tax;

  if (isLoading) {
    return (
      <div className="bg-gray-100 min-h-screen py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white border border-gray-300 rounded-lg flex items-center justify-center p-8 flex-col gap-y-4">
            <Loader2 className="text-gray-400 animate-spin size-8" />
            <p className="text-gray-600">Loading checkout...</p>
          </div>
        </div>
      </div>
    );
  }

  if (data?.docs.length === 0 || items.length === 0) {
    return (
      <div className="bg-gray-100 min-h-screen py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white border border-gray-300 rounded-lg flex items-center justify-center p-8 flex-col gap-y-4">
            <ShoppingCart className="size-12 text-gray-400" />
            <p className="text-lg font-medium text-gray-700">Your cart is empty</p>
            <Link href="/" className="text-blue-600 hover:text-blue-800 hover:underline">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = () => {
    if (!hasShippingAddress) {
      toast.error('Please add a shipping address before placing your order');
      router.push('/buyer/settings?tab=addresses');
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number. The supplier will contact you at this number.');
      return;
    }

    // Get shipping address (simplified - can be enhanced to use saved addresses)
    // TODO: Fetch from user's saved addresses
    const shippingAddress = {
      fullName: 'Customer', // TODO: Get from user profile
      street: '123 Main St', // Placeholder - should come from user's saved address
      city: 'City',
      state: 'State',
      zipcode: '12345',
      country: 'United States',
    };

    createOrder.mutate({
      cartItems: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.product.unitPrice,
      })),
      phoneNumber: phoneNumber.trim(),
      shippingAddress,
    });
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-gray-800 text-white py-3">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-medium">Secure checkout</h1>
            <Link href="/" className="flex items-center gap-2 hover:text-gray-300">
              <ShoppingCart className="w-5 h-5" />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Delivery & Payment */}
          <div className="lg:col-span-2 space-y-4">
            {/* Delivery Section */}
            <DeliverySection />

            {/* Phone Number Section */}
            <PhoneInputSection
              phoneNumber={phoneNumber}
              onPhoneChange={setPhoneNumber}
            />

            {/* Order Items Summary */}
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order items</h2>
              <div className="space-y-4">
                {items.map((cartItem) => {
                  const product = data?.docs.find((p: any) => p.id === cartItem.productId);
                  if (!product) return null;
                  
                  return (
                    <div
                      key={cartItem.productId}
                      className="flex gap-4 pb-4 border-b border-gray-200 last:border-0 relative group"
                    >
                      <div className="relative w-20 h-20 border border-gray-300 rounded overflow-hidden bg-white shrink-0">
                        {cartItem.product.images && cartItem.product.images[0]?.url ? (
                          <img
                            src={cartItem.product.images[0].url}
                            alt={cartItem.product.title}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ShoppingCart className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/products/${product.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline line-clamp-2"
                        >
                          {cartItem.product.title}
                        </Link>
                        <p className="text-xs text-gray-600 mt-1">Quantity: {cartItem.quantity}</p>
                        <p className="text-sm font-medium text-gray-900 mt-2">
                          ${(cartItem.product.unitPrice * cartItem.quantity).toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          removeItem(cartItem.productId);
                          toast.success('Item removed from cart');
                        }}
                        className="absolute top-0 right-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        aria-label="Remove item from cart"
                        title="Remove item"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary
              items={orderItems}
              subtotal={subtotal}
              shipping={shipping}
              tax={tax}
              total={total}
              hasShippingAddress={hasShippingAddress}
              hasPhoneNumber={!!phoneNumber.trim()}
              onPlaceOrder={handlePlaceOrder}
              isProcessing={createOrder.isPending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
