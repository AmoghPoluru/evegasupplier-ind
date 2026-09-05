import { TRPCError } from '@trpc/server';
import type { Where } from 'payload';
import { hydrateProductImages } from '@/lib/hydrate-product-images';
import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';

export const productsRouter = createTRPCRouter({
  list: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        page: z.number().min(1).optional().default(1),
        supplierId: z.string().optional(),
        category: z.string().optional(),
        search: z.string().optional(),
        verified: z.boolean().optional(),
        sort: z.enum(['newest', 'priceAsc', 'priceDesc', 'moqAsc']).optional().default('newest'),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Resolve the published supplier set first so Payload's own pagination
      // describes the full published-product set instead of a single page.
      // A supplier is published when status === 'approved' and isActive === true.
      const supplierWhere: Where = {
        status: { equals: 'approved' },
        isActive: { equals: true },
      };
      if (input.supplierId) {
        supplierWhere.id = { equals: input.supplierId };
      }
      if (input.verified) {
        supplierWhere.verifiedSupplier = { equals: true };
      }

      const publishedSuppliers = await ctx.payload.find({
        collection: 'suppliers',
        where: supplierWhere,
        pagination: false,
        depth: 0,
      });
      const supplierIds = publishedSuppliers.docs.map((supplier) => supplier.id);

      if (supplierIds.length === 0) {
        return { products: [], totalDocs: 0, totalPages: 0, page: input.page };
      }

      const where: Record<string, unknown> = {
        supplier: { in: supplierIds },
      };
      if (input.category) {
        where.category = { equals: input.category };
      }
      if (input.search) {
        where.or = [
          { title: { contains: input.search, options: 'i' } },
          { description: { contains: input.search, options: 'i' } },
          { sku: { contains: input.search, options: 'i' } },
        ];
      }

      const sortBy: Record<typeof input.sort, string> = {
        newest: '-createdAt',
        priceAsc: 'unitPrice',
        priceDesc: '-unitPrice',
        moqAsc: 'moq',
      };

      const result = await ctx.payload.find({
        collection: 'products',
        where: where as Where,
        limit: input.limit,
        page: input.page,
        sort: sortBy[input.sort],
        depth: 2, // supplier + nested relations; populate `images` → `media.url`
      });

      await Promise.all(
        result.docs.map((product) => hydrateProductImages(ctx.payload, product)),
      );

      return {
        products: result.docs,
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
        page: result.page,
      };
    }),

  getById: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.payload.findByID({
        collection: 'products',
        id: input.id,
        // Populate `images` → `media` (ids only would break storefront / next/image urls)
        depth: 2,
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      await hydrateProductImages(ctx.payload, product);

      return product;
    }),

  getByVendor: baseProcedure
    .input(
      z.object({
        vendorId: z.string(),
        limit: z.number().min(1).max(100).optional().default(8),
        page: z.number().min(1).optional().default(1),
        category: z.string().optional(),
        search: z.string().optional(),
        status: z.enum(['all', 'published', 'draft', 'archived']).optional().default('all'),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        supplier: { equals: input.vendorId },
      };
      
      if (input.category) {
        where.category = { equals: input.category };
      }
      
      // Search by title, description, or SKU
      if (input.search) {
        where.or = [
          { title: { contains: input.search, options: 'i' } },
          { description: { contains: input.search, options: 'i' } },
          { sku: { contains: input.search, options: 'i' } },
        ];
      }
      
      // Status filter
      if (input.status === 'published') {
        where.isPrivate = { equals: false };
        where.isArchived = { equals: false };
      } else if (input.status === 'draft') {
        where.isPrivate = { equals: true };
        where.isArchived = { equals: false };
      } else if (input.status === 'archived') {
        where.isArchived = { equals: true };
      }

      const result = await ctx.payload.find({
        collection: 'products',
        where: where as Where,
        limit: input.limit,
        page: input.page,
        sort: '-createdAt',
        depth: 2,
      });

      await Promise.all(
        result.docs.map((product) => hydrateProductImages(ctx.payload, product)),
      );

      return {
        products: result.docs,
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
        page: result.page,
      };
    }),
});
