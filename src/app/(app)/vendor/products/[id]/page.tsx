import { requireVendor } from '@/lib/middleware/vendor-auth';
import { getPayload } from 'payload';
import config from '@payload-config';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Copy, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { productImageSrc, nextImageUnoptimizedForSrc } from '@/lib/media-url';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const vendor = await requireVendor();
  const { id } = await params;
  const payload = await getPayload({ config });

  try {
    const product = await payload.findByID({
      collection: 'products',
      id,
      depth: 2,
    });

    // Verify product belongs to vendor
    const supplierId = typeof product.supplier === 'string'
      ? product.supplier
      : (product.supplier as any)?.id;

    if (supplierId !== vendor.id) {
      notFound();
    }

    const images = product.images
      ? (Array.isArray(product.images) ? product.images : [])
      : [];

    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/vendor/products"
              className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Products
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900">
              {product.title || 'Product Details'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">View and manage product details</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/vendor/products/${id}/edit`}>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Images Gallery */}
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
            </CardHeader>
            <CardContent>
              {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {images.map((img: any, index: number) => {
                    const imageUrl = productImageSrc(img);
                    return imageUrl ? (
                      <div key={index} className="aspect-square relative rounded-lg overflow-hidden border-2">
                        <Image
                          src={imageUrl}
                          alt={`Product image ${index + 1}`}
                          fill
                          unoptimized={nextImageUnoptimizedForSrc(imageUrl)}
                          className="object-cover"
                        />
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">No images</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableHead className="w-[150px]">Name</TableHead>
                     <TableCell>{product.title || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableCell>{product.description || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableCell>
                      {product.category ? (
                        <Badge variant="outline">{product.category}</Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                     <TableCell>{(product as any).sku || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Unit Price</TableHead>
                    <TableCell>
                      {product.unitPrice
                        ? `$${Number(product.unitPrice).toFixed(2)}`
                        : '-'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>MOQ</TableHead>
                    <TableCell>{product.moq || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHead>Status</TableHead>
                     <TableCell>
                       {(product as any).isArchived ? (
                         <Badge variant="secondary">Archived</Badge>
                       ) : (product as any).isPrivate ? (
                         <Badge variant="outline">Draft</Badge>
                       ) : (
                         <Badge variant="default">Published</Badge>
                       )}
                     </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Pricing Tiers */}
        {product.bulkPricingTiers && Array.isArray(product.bulkPricingTiers) && product.bulkPricingTiers.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Bulk Pricing Tiers</CardTitle>
              <CardDescription>Volume-based pricing</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Min Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.bulkPricingTiers.map((tier: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{tier.minQuantity || '-'}</TableCell>
                      <TableCell>${tier.price?.toFixed(2) || '-'}</TableCell>
                      <TableCell>{tier.unit || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  } catch (error) {
    notFound();
  }
}
