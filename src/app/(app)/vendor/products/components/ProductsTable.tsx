'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { trpc } from '@/trpc/client';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import { firstProductImageUrl, nextImageUnoptimizedForSrc } from '@/lib/media-url';

interface Product {
  id: string;
  title?: string;
  name?: string;
  unitPrice?: number;
  moq?: number;
  category?: string;
  images?: any[];
  isPrivate?: boolean;
  isArchived?: boolean;
}

interface ProductsTableProps {
  products: Product[];
  totalDocs: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  selectedProducts?: string[];
  onSelectionChange?: (selected: string[]) => void;
}

export function ProductsTable({
  products,
  totalDocs,
  page,
  totalPages,
  onPageChange,
  selectedProducts = [],
  onSelectionChange,
}: ProductsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const utils = trpc.useUtils();

  const deleteMutation = trpc.vendors.products.delete.useMutation({
    onSuccess: () => {
      toast.success('Product deleted successfully');
      utils.products.getByVendor.invalidate();
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (productToDelete) {
      deleteMutation.mutate({ id: productToDelete.id });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange(products.map((p) => p.id));
      } else {
        onSelectionChange([]);
      }
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange([...selectedProducts, productId]);
      } else {
        onSelectionChange(selectedProducts.filter((id) => id !== productId));
      }
    }
  };

  const allSelected = products.length > 0 && selectedProducts.length === products.length;
  const someSelected = selectedProducts.length > 0 && selectedProducts.length < products.length;

  const getProductName = (product: Product) => {
    return product.title || product.name || 'Untitled Product';
  };

  const getProductImage = (product: Product) => firstProductImageUrl(product.images);

  const getStatus = (product: Product) => {
    if (product.isArchived) return { label: 'Archived', variant: 'secondary' as const };
    if (product.isPrivate) return { label: 'Draft', variant: 'outline' as const };
    return { label: 'Published', variant: 'default' as const };
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No products found. Create your first product to get started.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {onSelectionChange && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead className="w-[100px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>MOQ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const status = getStatus(product);
              const imageUrl = getProductImage(product);
              
              const isSelected = selectedProducts.includes(product.id);
              
              return (
                <TableRow key={product.id}>
                  {onSelectionChange && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectProduct(product.id, checked as boolean)
                        }
                        aria-label={`Select ${getProductName(product)}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    {imageUrl ? (
                      <div className="w-16 h-16 relative rounded overflow-hidden">
                        <Image
                          src={imageUrl}
                          alt={getProductName(product)}
                          fill
                          unoptimized={nextImageUnoptimizedForSrc(imageUrl)}
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-500">No Image</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {getProductName(product)}
                  </TableCell>
                  <TableCell>
                    {product.category ? (
                      <Badge variant="outline">{product.category}</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.unitPrice
                      ? `$${Number(product.unitPrice).toFixed(2)}`
                      : '-'}
                  </TableCell>
                  <TableCell>{product.moq || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/vendor/products/${product.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/vendor/products/${product.id}/edit`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteClick(product)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-600">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, totalDocs)} of {totalDocs} products
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{productToDelete ? getProductName(productToDelete) : ''}"? 
              This action will archive the product and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setProductToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
