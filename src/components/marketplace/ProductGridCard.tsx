'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cart-store';
import { toast } from 'sonner';
import type { Product, Supplier } from '@/payload-types';
import {
  firstProductImageUrl,
  nextImageUnoptimizedForSrc,
  productImagesForCart,
} from '@/lib/media-url';

interface ProductGridCardProps {
  product: Product;
}

function specRows(product: Product): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (product.moq) {
    rows.push({
      label: 'MOQ',
      value: `Minimum ${product.moq} ${product.moq === 1 ? 'piece' : 'pieces'}`,
    });
  }
  if (product.category) rows.push({ label: 'Category', value: product.category });
  if (product.leadTime) rows.push({ label: 'Lead time', value: product.leadTime });
  return rows;
}

/**
 * ProductGridCard Component
 *
 * Dense, product-first card for the flat marketplace grid: image with price
 * overlay and verified pill, title, vendor line, spec table, and actions.
 */
export function ProductGridCard({ product }: ProductGridCardProps) {
  const { addItem } = useCartStore();

  const supplier: Supplier | null =
    product.supplier && typeof product.supplier === 'object' ? product.supplier : null;
  const imageUrl = firstProductImageUrl(product.images);
  const rows = specRows(product);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product.unitPrice || !product.moq) {
      toast.error('Product pricing information is missing');
      return;
    }

    addItem(
      {
        id: product.id,
        title: product.title || 'Product',
        unitPrice: Number(product.unitPrice),
        moq: product.moq,
        images: productImagesForCart(product.images),
      },
      product.moq,
    );
    toast.success('Product added to cart');
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border bg-card transition hover:shadow-md">
      <Link href={`/products/${product.id}`} className="relative block">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.title || 'Product'}
              width={600}
              height={800}
              unoptimized={nextImageUnoptimizedForSrc(imageUrl)}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              No Image
            </div>
          )}
          {product.unitPrice != null && (
            <div className="absolute bottom-0 left-0 rounded-tr-md bg-black/70 px-2.5 py-1 text-sm font-bold text-white">
              ${Number(product.unitPrice).toFixed(2)}
            </div>
          )}
          {supplier?.verifiedSupplier && (
            <div className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              Verified
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col">
        <Link href={`/products/${product.id}`} className="px-2.5 pt-2.5">
          <h3 className="line-clamp-2 min-h-[34px] text-[13px] font-semibold leading-snug group-hover:text-primary">
            {product.title}
          </h3>
        </Link>

        {supplier && (
          <Link
            href={`/vendors/${supplier.id}`}
            className="mx-2.5 mt-1.5 flex items-center gap-1.5 text-[11px] text-blue-700 hover:underline dark:text-blue-400"
          >
            <span className="inline-block h-4 w-4 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900" />
            <span className="truncate font-medium">{supplier.companyName}</span>
            {supplier.factoryLocation && (
              <span className="truncate text-muted-foreground">· {supplier.factoryLocation}</span>
            )}
          </Link>
        )}

        {rows.length > 0 && (
          <table className="mt-2 w-full table-fixed">
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th className="w-[34%] border-t px-2 py-1.5 text-left text-[12px] font-semibold text-muted-foreground">
                    {row.label}
                  </th>
                  <td className="border-t px-2 py-1.5 text-[12px]">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-auto flex gap-2 p-2.5">
          <Button asChild variant="secondary" size="sm" className="flex-1 text-[11px]">
            <Link href={`/products/${product.id}`}>View details</Link>
          </Button>
          <Button size="sm" className="flex-1 text-[11px]" onClick={handleAddToCart}>
            Add to cart
          </Button>
        </div>
      </div>
    </article>
  );
}
