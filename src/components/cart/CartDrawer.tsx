'use client';

import { useCartStore } from '@/stores/cart-store';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Plus, Minus, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCartStore();
  const total = getTotal();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Shopping Cart
            {items.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {items.length}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? 'Your cart is empty'
              : `${items.reduce((sum, item) => sum + item.quantity, 0)} item(s) in your cart`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-8rem)] mt-4">
          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">Your cart is empty</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add products to your cart to get started
                </p>
                <Button asChild onClick={() => onOpenChange(false)}>
                  <Link href="/vendors">Browse Suppliers</Link>
                </Button>
              </div>
            ) : (
              items.map((item) => {
                const imageUrl =
                  item.product.images && item.product.images.length > 0
                    ? item.product.images[0].url || ''
                    : '';

                return (
                  <div
                    key={item.productId}
                    className="flex gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    {/* Product Image */}
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 shrink-0">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={item.product.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.productId}`}
                        onClick={() => onOpenChange(false)}
                        className="block"
                      >
                        <h4 className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors">
                          {item.product.title}
                        </h4>
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">
                        ${item.product.unitPrice.toFixed(2)} each
                      </p>
                      <p className="text-xs text-muted-foreground">
                        MOQ: {item.product.moq}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= item.product.moq}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-medium w-8 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 ml-auto text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Item Total */}
                      <p className="text-sm font-semibold text-primary mt-2">
                        ${(item.product.unitPrice * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Footer */}
          {items.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    ${total.toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      clearCart();
                    }}
                  >
                    Clear Cart
                  </Button>
                  <Button className="flex-1" asChild>
                    <Link href="/checkout" onClick={() => onOpenChange(false)}>
                      Checkout
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
