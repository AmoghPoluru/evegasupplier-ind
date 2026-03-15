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
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.supplierId) {
        where.supplier = { equals: input.supplierId };
      }
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

      const result = await ctx.payload.find({
        collection: 'products',
        where: where as any,
        limit: input.limit,
        page: input.page,
        sort: '-createdAt',
        depth: 1, // Include supplier details
      });

      // Filter products to only include those from published suppliers
      // A supplier is published when status === 'approved' and isActive === true
      const publishedProducts = result.docs.filter((product: any) => {
        const supplier = product.supplier;
        if (!supplier) return false;
        
        // Handle both populated and ID reference
        const supplierData = typeof supplier === 'object' ? supplier : null;
        if (!supplierData) {
          // If supplier is just an ID, we need to fetch it
          // For now, we'll include it and let the frontend handle it
          // In production, you might want to fetch supplier details here
          return true; // Include for now, will be filtered by supplier queries
        }
        
        return (
          supplierData.status === 'approved' &&
          supplierData.isActive === true
        );
      });

      return {
        products: publishedProducts,
        totalDocs: publishedProducts.length,
        totalPages: Math.ceil(publishedProducts.length / input.limit),
        page: result.page,
      };
    }),

  getById: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.payload.findByID({
        collection: 'products',
        id: input.id,
      });
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
        where: where as any,
        limit: input.limit,
        page: input.page,
        sort: '-createdAt',
      });

      return {
        products: result.docs,
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
        page: result.page,
      };
    }),
});
