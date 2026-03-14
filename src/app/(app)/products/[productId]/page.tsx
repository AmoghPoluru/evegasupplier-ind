'use client';

import { notFound } from 'next/navigation';
import { trpc } from '@/trpc/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, 
  AlertCircle, 
  ShoppingCart, 
  MessageSquare, 
  MapPin, 
  CheckCircle2, 
  Star,
  Package,
  Clock,
  Globe,
  FileText,
  Award,
  Plus,
  Minus
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, use, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCartStore } from '@/stores/cart-store';

interface ProductDetailPageProps {
  params: Promise<{
    productId: string;
  }>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  // Unwrap the Promise using React.use()
  const { productId } = use(params);
  
  const { data: product, isLoading, error } = trpc.products.getById.useQuery({
    id: productId,
  });

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [quantityInputValue, setQuantityInputValue] = useState<string>('1');
  const [selectedPricingTier, setSelectedPricingTier] = useState<string>('custom');
  const { addItem } = useCartStore();

  // Update quantity when product loads
  useEffect(() => {
    if (product) {
      const initialQty = product.moq ?? 1;
      // Ensure quantity is at least 1
      const safeQty = Math.max(initialQty, 1);
      setQuantity(safeQty);
      setQuantityInputValue(safeQty.toString());
    }
  }, [product?.id, product?.moq]);

  // Find the best applicable bulk pricing tier for a given quantity
  const findApplicableTier = (qty: number): string | null => {
    if (!product?.bulkPricingTiers || !Array.isArray(product.bulkPricingTiers)) {
      return null;
    }
    
    const bulkTiers = product.bulkPricingTiers;
    
    // Sort tiers by minQuantity descending to find the highest applicable tier
    const sortedTiers = [...bulkTiers]
      .map((tier: any, index: number) => ({ tier, index, minQty: tier.minQuantity || 0 }))
      .sort((a, b) => b.minQty - a.minQty);
    
    // Find the highest tier that the quantity qualifies for
    const applicableTier = sortedTiers.find(({ minQty }) => qty >= minQty);
    
    return applicableTier ? `tier-${applicableTier.index}` : null;
  };

  // Handle pricing tier selection - if a bulk tier is selected, lock quantity to that tier's min
  const handlePricingTierChange = (value: string) => {
    setSelectedPricingTier(value);
    
    if (value === 'custom') {
      // When switching to custom, keep it selected (don't auto-select tier)
      return;
    }
    
    // If a bulk tier is selected, set quantity to that tier's minimum
    const bulkTiers = product?.bulkPricingTiers && Array.isArray(product.bulkPricingTiers) 
      ? product.bulkPricingTiers 
      : [];
    
    const tierIndex = parseInt(value.replace('tier-', '')) || -1;
    if (tierIndex >= 0 && tierIndex < bulkTiers.length) {
      const tier = bulkTiers[tierIndex];
      setQuantity(tier.minQuantity || product?.moq || 1);
    }
  };

  // Track the best applicable tier for current quantity (for pricing calculation)
  const bestApplicableTier = useMemo(() => {
    return findApplicableTier(quantity);
  }, [quantity, product?.bulkPricingTiers]);

  // Get the tier data for the best applicable tier
  const bestTierData = useMemo(() => {
    if (!bestApplicableTier || !product?.bulkPricingTiers) return null;
    
    const bulkTiers = Array.isArray(product.bulkPricingTiers) ? product.bulkPricingTiers : [];
    const tierIndex = parseInt(bestApplicableTier.replace('tier-', '')) || -1;
    return tierIndex >= 0 && tierIndex < bulkTiers.length ? bulkTiers[tierIndex] : null;
  }, [bestApplicableTier, product?.bulkPricingTiers]);

  // Get selected tier data (either manually selected or auto-applied for custom quantity)
  const selectedTierData = useMemo(() => {
    if (selectedPricingTier === 'custom') {
      // For custom quantity, use the best applicable tier for pricing
      return bestTierData;
    }
    
    const bulkTiers = product?.bulkPricingTiers && Array.isArray(product.bulkPricingTiers) 
      ? product.bulkPricingTiers 
      : [];
    
    const tierIndex = parseInt(selectedPricingTier.replace('tier-', '')) || -1;
    return tierIndex >= 0 && tierIndex < bulkTiers.length ? bulkTiers[tierIndex] : null;
  }, [product, selectedPricingTier, bestTierData]);

  // Calculate price based on selected tier and quantity
  const calculatedPrice = useMemo(() => {
    if (!product?.unitPrice) return 0;
    
    // Use best tier price if custom quantity qualifies for bulk pricing
    if (selectedPricingTier === 'custom' && bestTierData) {
      return Number(bestTierData.price || 0) * quantity;
    } else if (selectedPricingTier === 'custom') {
      return Number(product.unitPrice) * quantity;
    } else if (selectedTierData) {
      // For bulk pricing tiers, use the tier price and actual quantity entered
      return Number(selectedTierData.price || 0) * quantity;
    }
    
    return Number(product.unitPrice) * quantity;
  }, [product, selectedPricingTier, selectedTierData, bestTierData, quantity]);

  // Get unit price for selected tier
  const unitPrice = useMemo(() => {
    if (!product?.unitPrice) return 0;
    
    // Use best tier price if custom quantity qualifies for bulk pricing
    if (selectedPricingTier === 'custom' && bestTierData) {
      return Number(bestTierData.price || 0);
    } else if (selectedPricingTier === 'custom') {
      return Number(product.unitPrice);
    } else if (selectedTierData) {
      return Number(selectedTierData.price || 0);
    }
    
    return Number(product.unitPrice);
  }, [product, selectedPricingTier, selectedTierData, bestTierData]);

  // Handle quantity change - keep custom selected but use best tier for pricing
  const handleQuantityChange = (newQuantity: number) => {
    const minQty = product?.moq ?? 1; // MOQ can be 1 or higher
    
    // Allow any positive number >= 1
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
      setQuantityInputValue(newQuantity.toString());
      // Keep "custom" selected when user manually changes quantity
      if (selectedPricingTier.startsWith('tier-')) {
        setSelectedPricingTier('custom');
      }
    } else if (newQuantity === 0 || isNaN(newQuantity)) {
      // Set to minimum (MOQ or 1)
      setQuantity(minQty);
      setQuantityInputValue(minQty.toString());
      setSelectedPricingTier('custom');
    }
  };

  // Handle direct input change
  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Always update input value immediately (allows empty string and any input while typing)
    setQuantityInputValue(value);
    
    // Parse and update quantity if valid
    if (value === '') {
      // Allow empty input while typing, don't update quantity yet
      // But ensure quantity doesn't go below 1
      return;
    }
    
    const newQty = parseInt(value, 10);
    if (!isNaN(newQty) && newQty >= 0) {
      // Ensure quantity is at least 1
      const safeQty = Math.max(newQty, 1);
      setQuantity(safeQty);
      // Update input value to match the safe quantity if it was adjusted
      if (newQty < 1) {
        setQuantityInputValue(safeQty.toString());
      }
      // Keep "custom" selected when user manually types quantity
      if (selectedPricingTier.startsWith('tier-')) {
        setSelectedPricingTier('custom');
      }
    } else if (isNaN(newQty)) {
      // Invalid input, keep current quantity but allow typing
      return;
    }
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (!product) return;
    
    const minQty = product.moq ?? 1; // MOQ can be 1 or higher
    if (quantity < minQty) {
      alert(`Minimum order quantity is ${minQty}`);
      return;
    }

    // Get image URLs - reuse the same logic from the component
    const getImageUrls = () => {
      if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
        return [];
      }
      return product.images.map((img: any) => {
        if (typeof img === 'string') return { id: '', url: img };
        if (typeof img === 'object' && img !== null && 'url' in img) {
          return { id: img.id || '', url: img.url || '' };
        }
        return { id: '', url: '' };
      }).filter((img: any) => img.url);
    };

    // Ensure we have valid product data
    const productData = {
      id: product.id,
      title: product.title || 'Product',
      unitPrice: unitPrice,
      moq: product.moq || 1,
      images: getImageUrls(),
    };

    try {
      addItem(productData, quantity);
      // Show success feedback (you can replace with a toast notification)
      alert(`Added ${quantity} ${quantity === 1 ? 'unit' : 'units'} to cart`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add item to cart. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading product...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <p className="font-semibold">Error loading product</p>
                  <p className="text-sm">{error?.message || 'Product not found'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Get product images
  const getImageUrls = () => {
    if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
      return [];
    }
    return product.images.map((img) => {
      if (typeof img === 'string') return img;
      if (typeof img === 'object' && img !== null && 'url' in img) {
        return (img as any).url;
      }
      return null;
    }).filter(Boolean) as string[];
  };

  const imageUrls = getImageUrls();
  const mainImage = imageUrls[selectedImageIndex] || imageUrls[0];

  // Get supplier info
  const supplier = typeof product.supplier === 'object' && product.supplier !== null 
    ? product.supplier as any 
    : null;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            {supplier && (
              <>
                <Link href={`/vendors/${supplier.id}`} className="hover:text-foreground transition-colors">
                  {supplier.companyName || 'Vendor'}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-foreground">{product.title}</span>
          </div>
        </nav>

        {/* Product Detail Layout - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Image Gallery */}
          <div>
            {/* Main Image */}
            <Card className="border-2 border-blue-100/50 dark:border-blue-900/30 mb-4">
              <CardContent className="p-0">
                <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 border-blue-100 dark:border-blue-900/50 overflow-hidden flex items-center justify-center relative">
                  {mainImage ? (
                    <Image
                      src={mainImage}
                      alt={product.title || 'Product'}
                      width={800}
                      height={800}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-muted-foreground">No Image</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Thumbnails */}
            {imageUrls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {imageUrls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition-all ${
                      selectedImageIndex === index
                        ? 'border-primary ring-2 ring-primary ring-offset-2'
                        : 'border-border hover:border-primary'
                    }`}
                  >
                    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                      <Image
                        src={url}
                        alt={`${product.title} ${index + 1}`}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Product Info */}
          <div className="flex flex-col gap-6">
            {/* Product Title */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
                {product.title}
              </h1>
              {product.category && (
                <Badge variant="secondary" className="mt-2">
                  {product.category}
                </Badge>
              )}
            </div>

            {/* Price Display and Selection */}
            {product.unitPrice && (
              <Card className="border-blue-100/50 dark:border-blue-900/30">
                <CardContent className="pt-6">
                  {/* Price Display */}
                  <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-3xl font-bold text-red-600 dark:text-red-400">
                        ${unitPrice.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">per unit</span>
                </div>
                    {product.moq && (
                      <p className="text-sm text-muted-foreground mb-4">
                        Minimum Order Quantity: <span className="font-semibold text-foreground">{product.moq}</span>
                      </p>
                    )}
              </div>

                  {/* Pricing Selection - Custom Quantity or Package */}
                  <div className="mb-6">
                    <Label className="text-sm font-medium mb-3 block">Select Quantity or Package</Label>
                    <RadioGroup
                      value={selectedPricingTier}
                      onValueChange={handlePricingTierChange}
                      className="space-y-3"
                    >
                      {/* Custom Quantity Option */}
                      <div className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                        selectedPricingTier === 'custom'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-transparent hover:border-blue-200 dark:hover:border-blue-800'
                      }`}>
                        <RadioGroupItem value="custom" id="custom" />
                        <Label
                          htmlFor="custom"
                          className="flex-1 cursor-pointer"
                        >
                          <span className="font-medium">Custom Quantity</span>
                          <span className="text-sm text-muted-foreground block mt-1">
                            Choose your own quantity
                          </span>
                        </Label>
                      </div>

                      {/* Bulk Pricing Packages */}
            {product.bulkPricingTiers && 
             Array.isArray(product.bulkPricingTiers) && 
                       product.bulkPricingTiers.length > 0 && 
                       product.bulkPricingTiers.map((tier: any, index: number) => {
                         const tierId = `tier-${index}`;
                         const isSelected = selectedPricingTier === tierId;
                         const packageQuantity = tier.minQuantity || 0;
                         const packageTotal = Number(tier.price || 0) * packageQuantity;
                         
                         return (
                           <div
                             key={index}
                             className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                               isSelected
                                 ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                                 : 'border-transparent hover:border-blue-200 dark:hover:border-blue-800'
                             }`}
                           >
                             <RadioGroupItem
                               value={tierId}
                               id={tierId}
                             />
                             <Label
                               htmlFor={tierId}
                               className="flex-1 cursor-pointer flex items-center justify-between"
                             >
                               <div>
                                 <span className="font-medium">{packageQuantity} units</span>
                                 <span className="text-sm text-muted-foreground block mt-1">
                                   ${Number(tier.price || 0).toFixed(2)} per unit
                                 </span>
                               </div>
                               <div className="text-right">
                                 <span className="font-semibold text-red-600 dark:text-red-400 text-lg">
                                   ${packageTotal.toFixed(2)}
                                 </span>
                                 <span className="text-xs text-muted-foreground block">Total</span>
                               </div>
                             </Label>
                           </div>
                         );
                       })}
                    </RadioGroup>
                  </div>

                  {/* Quantity Selector - Always shown, but behavior changes based on selection */}
                  <div className="mb-6">
                    <Label htmlFor="quantity" className="text-sm font-medium mb-2 block">
                      Quantity
                      {selectedPricingTier !== 'custom' && selectedTierData && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (Auto-selected tier: {selectedTierData.minQuantity}+ units)
                        </span>
                      )}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(quantity - 1)}
                        disabled={quantity <= 1}
                        className="h-10 w-10"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id="quantity"
                        type="number"
                        min={1}
                        value={quantityInputValue}
                        onChange={handleQuantityInputChange}
                        onBlur={(e) => {
                          // Ensure quantity is at least MOQ (which can be 1 or higher)
                          const minQty = product.moq ?? 1;
                          const value = e.target.value;
                          if (value === '' || isNaN(parseInt(value, 10))) {
                            setQuantity(minQty);
                            setQuantityInputValue(minQty.toString());
                            setSelectedPricingTier('custom');
                          } else {
                            const numValue = parseInt(value, 10);
                            if (numValue < 1) {
                              setQuantity(1);
                              setQuantityInputValue('1');
                              setSelectedPricingTier('custom');
                            } else if (numValue < minQty) {
                              setQuantity(minQty);
                              setQuantityInputValue(minQty.toString());
                              setSelectedPricingTier('custom');
                            } else {
                              setQuantity(numValue);
                              setQuantityInputValue(numValue.toString());
                            }
                          }
                        }}
                        className="w-24 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(quantity + 1)}
                        className="h-10 w-10"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {(() => {
                      // Only show red warning if quantity is actually less than 1
                      // Don't show it based on input value while typing
                      if (quantity < 1) {
                        return (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                            Minimum quantity is 1
                          </p>
                        );
                      }
                      return null;
                    })()}
                    {quantity >= 1 && product.moq != null && product.moq > 1 && quantity < product.moq && (
                      <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                        Minimum order quantity (MOQ) is {product.moq}
                      </p>
                    )}
                    {selectedPricingTier === 'custom' && bestTierData && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                        ✓ Bulk pricing applied: {bestTierData.minQuantity}+ units at ${Number(bestTierData.price || 0).toFixed(2)} per unit
                      </p>
                    )}
                    {selectedPricingTier !== 'custom' && selectedTierData && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                        ✓ Package selected: {selectedTierData.minQuantity} units at ${Number(selectedTierData.price || 0).toFixed(2)} per unit
                      </p>
                    )}
                    {selectedPricingTier === 'custom' && !bestTierData && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Using standard unit price
                      </p>
                    )}
                  </div>

                  {/* Total Price Display */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">Total Price:</span>
                      <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                        ${calculatedPrice.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {quantity} {quantity === 1 ? 'unit' : 'units'} × ${unitPrice.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                size="lg" 
                className="flex-1"
                onClick={handleAddToCart}
                disabled={!product || quantity < 1 || (product.moq != null && quantity < product.moq)}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
              <Button variant="outline" size="lg" className="flex-1">
                <MessageSquare className="w-5 h-5 mr-2" />
                Request Quote
              </Button>
            </div>

            {/* Product Description */}
            {product.description && (
              <Card className="border-blue-100/50 dark:border-blue-900/30">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-3">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Supplier Information */}
            {supplier && (
              <Card className="border-blue-100/50 dark:border-blue-900/30 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-3">Supplier</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                      <Link 
                        href={`/vendors/${supplier.id}`}
                        className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                      >
                        {supplier.companyName}
                      </Link>
                      {supplier.factoryLocation && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-4 h-4" />
                          <span>{supplier.factoryLocation}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {supplier.verifiedSupplier && (
                        <Badge variant="default" className="gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 rounded-full px-3 py-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </Badge>
                      )}
                      {supplier.goldSupplier && (
                        <Badge variant="secondary" className="gap-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-0 rounded-full px-3 py-1">
                          <Star className="w-3.5 h-3.5 fill-white" />
                          Gold
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Link href={`/vendors/${supplier.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Supplier Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Specifications Table */}
        <Card className="mb-8 border-blue-100/50 dark:border-blue-900/30">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Specifications
            </h2>
            <Table>
              <TableBody>
                {product.moq && (
                  <TableRow>
                    <TableCell className="font-medium w-1/3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Minimum Order Quantity (MOQ)
                      </div>
                    </TableCell>
                    <TableCell>{product.moq}</TableCell>
                  </TableRow>
                )}
                {product.leadTime && (
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        Lead Time
                      </div>
                    </TableCell>
                    <TableCell>{product.leadTime}</TableCell>
                  </TableRow>
                )}
                {product.originCountry && (
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-green-600 dark:text-green-400" />
                        Country of Origin
                      </div>
                    </TableCell>
                    <TableCell>{product.originCountry}</TableCell>
                  </TableRow>
                )}
                {product.hsCode && (
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                        HS Code
                      </div>
                    </TableCell>
                    <TableCell>{product.hsCode}</TableCell>
                  </TableRow>
                )}
                {product.productCertifications && 
                 Array.isArray(product.productCertifications) && 
                 product.productCertifications.length > 0 && (
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        Certifications
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {product.productCertifications.map((cert: any, index: number) => (
                          <Badge key={index} variant="outline">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {product.sampleAvailable !== undefined && (
                  <TableRow>
                    <TableCell className="font-medium">Sample Available</TableCell>
                    <TableCell>
                      {product.sampleAvailable ? (
                        <Badge variant="default" className="bg-green-600">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )}
                {product.samplePrice && (
                  <TableRow>
                    <TableCell className="font-medium">Sample Price</TableCell>
                    <TableCell>${Number(product.samplePrice).toFixed(2)}</TableCell>
                  </TableRow>
                )}
                {product.customizationAvailable !== undefined && (
                  <TableRow>
                    <TableCell className="font-medium">Customization Available</TableCell>
                    <TableCell>
                      {product.customizationAvailable ? (
                        <Badge variant="default" className="bg-blue-600">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
