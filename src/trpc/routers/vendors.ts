import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { getPayload } from 'payload';
import config from '@payload-config';
import {
  buildVendorSelfServicePatch,
  vendorSelfServiceProfileSchema,
} from '@/lib/vendor-self-service-profile';
import { hydrateProductImages } from '@/lib/hydrate-product-images';

// Helper to get vendor ID from session
async function getVendorIdFromSession(ctx: any): Promise<string | null> {
  try {
    const payload = ctx.payload || await getPayload({ config });
    const { user } = await payload.auth({ headers: ctx.headers });
    
    if (!user) return null;
    
    const vendorsResult = await payload.find({
      collection: 'suppliers',
      where: { user: { equals: user.id } },
      limit: 1,
    });
    
    return vendorsResult.docs[0]?.id || null;
  } catch {
    return null;
  }
}

export const vendorsRouter = createTRPCRouter({
  list: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        page: z.number().min(1).optional().default(1),
        verified: z.boolean().optional(),
        includeUnpublished: z.boolean().optional().default(false), // Admin override
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      
      // Filter by verified status if provided
      if (input.verified !== undefined) {
        where.verifiedSupplier = { equals: input.verified };
      }

      // Filter only published suppliers (approved and active) unless admin override
      if (!input.includeUnpublished) {
        where.status = { equals: 'approved' };
        where.isActive = { equals: true };
      }

      const result = await ctx.payload.find({
        collection: 'suppliers',
        where: where as any,
        limit: input.limit,
        page: input.page,
        sort: '-createdAt',
      });

      return {
        vendors: result.docs,
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
        page: result.page,
      };
    }),

  getById: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const vendor = await ctx.payload.findByID({
        collection: 'suppliers',
        id: input.id,
      });
      return vendor;
    }),

  getByUser: baseProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const payload = ctx.payload;
      const { user } = await payload.auth({ headers: ctx.headers });

      const result = await payload.find({
        collection: 'suppliers',
        where: { user: { equals: input.userId } },
        limit: 1,
        depth: 0,
      });
      const vendor = result.docs[0] ?? null;
      if (!vendor) return null;

      const isOwner = user?.id === input.userId;
      const isAdmin = (user as { role?: string } | undefined)?.role === 'admin';
      if (isOwner || isAdmin) {
        const full = await payload.findByID({
          collection: 'suppliers',
          id: vendor.id,
          depth: 0,
          overrideAccess: true,
          showHiddenFields: true,
        });
        return full ?? vendor;
      }

      const { openaiApiKey: _omit, ...publicVendor } = vendor as {
        openaiApiKey?: unknown;
        [key: string]: unknown;
      };
      return publicVendor;
    }),

  updateAccountSettings: baseProcedure
    .input(vendorSelfServiceProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const payload = ctx.payload ?? (await getPayload({ config }));
      const { user } = await payload.auth({ headers: ctx.headers });
      if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }

      const vendorsResult = await payload.find({
        collection: 'suppliers',
        where: { user: { equals: user.id } },
        limit: 1,
      });
      const vendor = vendorsResult.docs[0];
      if (!vendor) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Vendor profile not found' });
      }

      await payload.update({
        collection: 'users',
        id: user.id,
        data: { name: input.name },
        overrideAccess: true,
      });

      const vendorPatch = buildVendorSelfServicePatch(input) as Record<string, unknown>;
      const prevKp = (vendor as { keyPersonnel?: { name?: string; title?: string; email?: string }[] })
        .keyPersonnel;
      const nextKp = vendorPatch.keyPersonnel as { name: string; title?: string }[] | undefined;
      if (Array.isArray(nextKp) && Array.isArray(prevKp)) {
        vendorPatch.keyPersonnel = nextKp.map((row, i) => {
          const email = prevKp[i]?.email;
          return email ? { ...row, email } : row;
        });
      }

      await payload.update({
        collection: 'suppliers',
        id: vendor.id,
        data: vendorPatch,
      });

      const updated = await payload.findByID({
        collection: 'suppliers',
        id: vendor.id,
        depth: 0,
      });
      return updated;
    }),

  marketplace: createTRPCRouter({
    list: baseProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).optional().default(10),
          page: z.number().min(1).optional().default(1),
          verified: z.boolean().optional(),
          includeProducts: z.boolean().optional().default(true),
          search: z.string().optional(),
          location: z.string().optional(),
          category: z.string().optional(),
          sort: z.enum(['newest', 'verified', 'name']).optional().default('newest'),
          supplierId: z.string().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const where: Record<string, unknown> = {};
        
        // Filter only published suppliers (approved and active)
        where.status = { equals: 'approved' };
        where.isActive = { equals: true };
        
        // Supplier filter (filter by specific supplier ID)
        if (input.supplierId) {
          where.id = { equals: input.supplierId };
        }
        
        // Verified filter
        if (input.verified !== undefined) {
          where.verifiedSupplier = { equals: input.verified };
        }
        
        // Search filter (by company name)
        if (input.search) {
          where.companyName = { contains: input.search, options: 'i' };
        }
        
        // Location filter
        if (input.location) {
          where.factoryLocation = { contains: input.location, options: 'i' };
        }
        
        // Category filter (via products relationship - complex, would need aggregation)
        // For now, we'll skip category filter as it requires checking vendor's products
        
        // Determine sort order
        let sort: string;
        switch (input.sort) {
          case 'verified':
            sort = '-verifiedSupplier,-createdAt';
            break;
          case 'name':
            sort = 'companyName';
            break;
          case 'newest':
          default:
            sort = '-createdAt';
            break;
        }

        const result = await ctx.payload.find({
          collection: 'suppliers',
          where: where as any,
          limit: input.limit,
          page: input.page,
          sort,
        });

        // If includeProducts is true, fetch products for each vendor
        if (input.includeProducts) {
          const vendorsWithProducts = await Promise.all(
            result.docs.map(async (vendor) => {
              const productsResult = await ctx.payload.find({
                collection: 'products',
                where: { supplier: { equals: vendor.id } },
                limit: 8, // Limit to 8 products per vendor for main page
                sort: '-createdAt',
                depth: 2,
              });
              await Promise.all(
                productsResult.docs.map((p) =>
                  hydrateProductImages(ctx.payload, p),
                ),
              );
              return {
                ...vendor,
                products: productsResult.docs,
              };
            }),
          );
          return {
            vendors: vendorsWithProducts,
            totalDocs: result.totalDocs,
            totalPages: result.totalPages,
            page: result.page,
          };
        }

        return {
          vendors: result.docs,
          totalDocs: result.totalDocs,
          totalPages: result.totalPages,
          page: result.page,
        };
      }),

    getById: baseProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        try {
          const vendor = await ctx.payload.findByID({
            collection: 'suppliers',
            id: input.id,
          });

          if (!vendor) {
            throw new Error('Vendor not found');
          }

          // Fetch products for this vendor
          const productsResult = await ctx.payload.find({
            collection: 'products',
            where: { supplier: { equals: vendor.id } },
            limit: 100,
            sort: '-createdAt',
            depth: 2,
          });
          await Promise.all(
            productsResult.docs.map((p) => hydrateProductImages(ctx.payload, p)),
          );

          return {
            ...vendor,
            products: productsResult.docs,
          };
        } catch (error: any) {
          // Handle case where vendor doesn't exist
          // Payload throws errors with specific messages
          const errorMessage = error?.message || String(error);
          if (
            errorMessage.includes('not found') || 
            errorMessage.includes('No document') ||
            error?.status === 404 ||
            error?.statusCode === 404
          ) {
            throw new Error('Vendor not found');
          }
          // Re-throw other errors
          throw error;
        }
      }),
  }),

  analytics: createTRPCRouter({
    revenue: baseProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
        }),
      )
      .query(async ({ ctx, input }) => {
        const vendorId = await getVendorIdFromSession(ctx);
        if (!vendorId) {
          throw new Error('Vendor not found. Please ensure you are logged in as a vendor.');
        }
        // Get vendor's orders
        const where: Record<string, unknown> = {
          supplier: { equals: vendorId },
        };

        if (input.startDate || input.endDate) {
          where.createdAt = {} as any;
          if (input.startDate) {
            (where.createdAt as any).greaterThanEqual = input.startDate;
          }
          if (input.endDate) {
            (where.createdAt as any).lessThanEqual = input.endDate;
          }
        }

        const orders = await ctx.payload.find({
          collection: 'orders',
          where: where as any,
          limit: 1000,
          sort: 'createdAt',
        });

        // Group revenue by date
        const revenueByDate: Record<string, number> = {};
        let totalRevenue = 0;

        orders.docs.forEach((order: any) => {
          const orderDate = new Date(order.createdAt);
          let dateKey: string;

          if (input.groupBy === 'day') {
            dateKey = orderDate.toISOString().split('T')[0];
          } else if (input.groupBy === 'week') {
            const weekStart = new Date(orderDate);
            weekStart.setDate(orderDate.getDate() - orderDate.getDay());
            dateKey = weekStart.toISOString().split('T')[0];
          } else {
            dateKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
          }

          if (!revenueByDate[dateKey]) {
            revenueByDate[dateKey] = 0;
          }
          revenueByDate[dateKey] += order.totalAmount || 0;
          totalRevenue += order.totalAmount || 0;
        });

        return {
          data: Object.entries(revenueByDate).map(([date, revenue]) => ({
            date,
            revenue,
          })),
          totalRevenue,
        };
      }),

    orderStats: baseProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const vendorId = await getVendorIdFromSession(ctx);
        if (!vendorId) {
          throw new Error('Vendor not found. Please ensure you are logged in as a vendor.');
        }
        const where: Record<string, unknown> = {
          supplier: { equals: vendorId },
        };

        if (input.startDate || input.endDate) {
          where.createdAt = {} as any;
          if (input.startDate) {
            (where.createdAt as any).greaterThanEqual = input.startDate;
          }
          if (input.endDate) {
            (where.createdAt as any).lessThanEqual = input.endDate;
          }
        }

        const orders = await ctx.payload.find({
          collection: 'orders',
          where: where as any,
          limit: 1000,
        });

        const totalOrders = orders.totalDocs;
        const totalRevenue = orders.docs.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Count orders by status
        const ordersByStatus: Record<string, number> = {};
        orders.docs.forEach((order: any) => {
          const status = order.status || 'pending';
          ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
        });

        return {
          totalOrders,
          totalRevenue,
          averageOrderValue,
          ordersByStatus,
        };
      }),

    productPerformance: baseProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          limit: z.number().optional().default(10),
        }),
      )
      .query(async ({ ctx, input }) => {
        const vendorId = await getVendorIdFromSession(ctx);
        if (!vendorId) {
          throw new Error('Vendor not found. Please ensure you are logged in as a vendor.');
        }
        const where: Record<string, unknown> = {
          supplier: { equals: vendorId },
        };

        if (input.startDate || input.endDate) {
          where.createdAt = {} as any;
          if (input.startDate) {
            (where.createdAt as any).greaterThanEqual = input.startDate;
          }
          if (input.endDate) {
            (where.createdAt as any).lessThanEqual = input.endDate;
          }
        }

        const orders = await ctx.payload.find({
          collection: 'orders',
          where: where as any,
          limit: 1000,
        });

        // Aggregate product performance
        const productStats: Record<string, { name: string; salesCount: number; revenue: number }> = {};

        orders.docs.forEach((order: any) => {
          if (order.products && Array.isArray(order.products)) {
            order.products.forEach((item: any) => {
              const productId = typeof item.product === 'string' ? item.product : item.product?.id;
              if (productId) {
                if (!productStats[productId]) {
                  productStats[productId] = {
                    name: item.product?.title || `Product ${productId}`,
                    salesCount: 0,
                    revenue: 0,
                  };
                }
                productStats[productId].salesCount += item.quantity || 0;
                productStats[productId].revenue += item.totalPrice || 0;
              }
            });
          }
        });

        // Get product names
        const productIds = Object.keys(productStats);
        if (productIds.length > 0) {
          const products = await ctx.payload.find({
            collection: 'products',
            where: { id: { in: productIds } },
            limit: 1000,
          });

          products.docs.forEach((product: any) => {
            if (productStats[product.id]) {
              productStats[product.id].name = product.title || product.name || `Product ${product.id}`;
            }
          });
        }

        // Sort by revenue and limit
        const sortedProducts = Object.entries(productStats)
          .map(([id, stats]) => ({ id, ...stats }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, input.limit);

        return sortedProducts;
      }),
  }),

  products: createTRPCRouter({
    create: baseProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          category: z.string().optional(),
          unitPrice: z.number().min(0).nullable().optional(),
          moq: z.number().int().min(0).nullable().optional(),
          sku: z.string().optional(),
          actualSupplierUrl: z
            .string()
            .max(2048)
            .optional()
            .refine(
              (v) => !v || v.trim() === '' || /^https?:\/\/.+/i.test(v.trim()),
              { message: 'Actual supplier URL must be empty or start with http:// or https://' },
            ),
          images: z.array(z.string()).optional(),
          bulkPricingTiers: z.array(z.object({
            minQuantity: z.number(),
            price: z.number(),
            unit: z.string(),
          })).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const vendorId = await getVendorIdFromSession(ctx);
        if (!vendorId) {
          throw new Error('Vendor not found. Please ensure you are logged in as a vendor.');
        }

        const product = await ctx.payload.create({
          collection: 'products',
          data: {
            ...input,
            unitPrice: input.unitPrice ?? null,
            moq: input.moq ?? null,
            supplier: vendorId,
            isPrivate: true, // Default to draft
            isArchived: false,
          } as any,
          overrideAccess: true,
        });

        return product;
      }),

    suggestFromImage: baseProcedure
      .input(
        z.object({
          mediaId: z.string().min(1),
          fallbackTitle: z.string().min(1).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const vendorId = await getVendorIdFromSession(ctx);
        if (!vendorId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vendor not found. Please ensure you are logged in as a vendor.',
          });
        }

        const media = await ctx.payload.findByID({
          collection: 'media',
          id: input.mediaId,
          depth: 0,
          overrideAccess: true,
        });
        if (!media) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Media not found',
          });
        }

        const { resolveMediaDisplayUrl } = await import('@/lib/media-url');
        const { suggestProductCopyFromImageUrl } = await import(
          '@/lib/openai-product-from-image'
        );

        const imageUrl = resolveMediaDisplayUrl(media as any, {
          allowIdProxy: false,
        });
        if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'Media has no public image URL for AI (need Blob CDN URL).',
          });
        }

        const fallback =
          input.fallbackTitle?.trim() ||
          (typeof media.alt === 'string' && media.alt.trim()) ||
          'Product';

        let supplierKey: string | null = null;
        try {
          const vendor = await ctx.payload.findByID({
            collection: 'suppliers',
            id: vendorId,
            depth: 0,
            overrideAccess: true,
            showHiddenFields: true,
          });
          const raw = (vendor as { openaiApiKey?: unknown })?.openaiApiKey;
          supplierKey =
            typeof raw === 'string' && raw.trim() ? raw.trim() : null;
        } catch {
          supplierKey = null;
        }

        if (!supplierKey) {
          return {
            title: fallback,
            description: '',
            unitPrice: null as number | null,
            usedAi: false as const,
            skipReason:
              'No OPENAI_API_KEY on your supplier profile — set it in Account Settings or ask your admin',
            keySource: 'none' as const,
          };
        }

        try {
          const copy = await suggestProductCopyFromImageUrl(
            imageUrl,
            fallback,
            { apiKey: supplierKey, allowEnvFallback: false },
          );
          return {
            title: copy.title,
            description: copy.description,
            unitPrice: copy.unitPrice,
            usedAi: true as const,
            skipReason: null as string | null,
            keySource: 'supplier' as const,
          };
        } catch (e: unknown) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message:
              e instanceof Error
                ? e.message
                : 'Failed to analyze image with AI',
          });
        }
      }),

    update: baseProcedure
      .input(
        z.object({
          id: z.string(),
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          category: z.string().optional(),
          unitPrice: z.number().min(0).optional(),
          moq: z.number().int().min(1).optional(),
          sku: z.string().optional(),
          actualSupplierUrl: z
            .string()
            .max(2048)
            .optional()
            .refine(
              (v) => !v || v.trim() === '' || /^https?:\/\/.+/i.test(v.trim()),
              { message: 'Actual supplier URL must be empty or start with http:// or https://' },
            ),
          images: z.array(z.string()).optional(),
          bulkPricingTiers: z.array(z.object({
            minQuantity: z.number(),
            price: z.number(),
            unit: z.string(),
          })).optional(),
          isPrivate: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const vendorId = await getVendorIdFromSession(ctx);
        if (!vendorId) {
          throw new Error('Vendor not found. Please ensure you are logged in as a vendor.');
        }

        // Verify product belongs to vendor
        const existingProduct = await ctx.payload.findByID({
          collection: 'products',
          id: input.id,
        });

        if (!existingProduct) {
          throw new Error('Product not found');
        }

        const supplierId = typeof existingProduct.supplier === 'string' 
          ? existingProduct.supplier 
          : (existingProduct.supplier as any)?.id;

        if (supplierId !== vendorId) {
          throw new Error('You do not have permission to update this product');
        }

        const { id, ...updateData } = input;
        const product = await ctx.payload.update({
          collection: 'products',
          id,
          data: updateData as any,
          overrideAccess: true,
        });

        return product;
      }),

    delete: baseProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const vendorId = await getVendorIdFromSession(ctx);
        if (!vendorId) {
          throw new Error('Vendor not found. Please ensure you are logged in as a vendor.');
        }

        // Verify product belongs to vendor
        const existingProduct = await ctx.payload.findByID({
          collection: 'products',
          id: input.id,
        });

        if (!existingProduct) {
          throw new Error('Product not found');
        }

        const supplierId = typeof existingProduct.supplier === 'string' 
          ? existingProduct.supplier 
          : (existingProduct.supplier as any)?.id;

        if (supplierId !== vendorId) {
          throw new Error('You do not have permission to delete this product');
        }

        await ctx.payload.update({
          collection: 'products',
          id: input.id,
          data: { isArchived: true },
          overrideAccess: true,
        });

        return { success: true };
      }),

    bulkUpdate: baseProcedure
      .input(
        z.object({
          productIds: z.array(z.string()),
          action: z.enum(['publish', 'archive', 'delete']),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const vendorId = await getVendorIdFromSession(ctx);
        if (!vendorId) {
          throw new Error('Vendor not found. Please ensure you are logged in as a vendor.');
        }

        // Verify all products belong to vendor
        const products = await ctx.payload.find({
          collection: 'products',
          where: { id: { in: input.productIds } },
          limit: 1000,
        });

        const invalidProducts = products.docs.filter((product: any) => {
          const supplierId = typeof product.supplier === 'string' 
            ? product.supplier 
            : (product.supplier as any)?.id;
          return supplierId !== vendorId;
        });

        if (invalidProducts.length > 0) {
          throw new Error('Some products do not belong to you');
        }

        // Perform bulk action
        const updateData: any = {};
        if (input.action === 'publish') {
          updateData.isPrivate = false;
        } else if (input.action === 'archive') {
          updateData.isArchived = true;
        }

        const results = await Promise.all(
          input.productIds.map(async (id) => {
            if (input.action === 'delete') {
              await ctx.payload.update({
                collection: 'products',
                id,
                data: { isArchived: true },
                overrideAccess: true,
              });
            } else {
              await ctx.payload.update({
                collection: 'products',
                id,
                data: updateData,
                overrideAccess: true,
              });
            }
            return { id, success: true };
          })
        );

        return { results, success: results.length };
      }),
  }),


  /**
   * Orders management
   */
  orders: createTRPCRouter({
    /**
     * List all orders for this supplier
     */
    list: baseProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).optional().default(20),
          page: z.number().min(1).optional().default(1),
          status: z.string().optional(),
          search: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          sort: z.enum(['createdAt', '-createdAt', 'totalAmount', '-totalAmount']).optional().default('-createdAt'),
        }),
      )
      .query(async ({ ctx, input }) => {
        const vendorId = await getVendorIdFromSession(ctx);
        if (!vendorId) {
          throw new Error('Vendor not found. Please ensure you are logged in as a vendor.');
        }

        const where: any = {
          supplier: { equals: vendorId },
        };

        if (input.status) {
          where.status = { equals: input.status };
        }

        if (input.search) {
          // Search by buyer company name (need to join through buyer relationship)
          where.or = [
            { poNumber: { contains: input.search } },
            { invoiceNumber: { contains: input.search } },
          ];
        }

        if (input.startDate || input.endDate) {
          where.createdAt = {};
          if (input.startDate) {
            where.createdAt.greaterThanEqual = input.startDate;
          }
          if (input.endDate) {
            where.createdAt.lessThanEqual = input.endDate;
          }
        }

        const result = await ctx.payload.find({
          collection: 'orders',
          where,
          limit: input.limit,
          page: input.page,
          sort: input.sort,
          depth: 2, // Include buyer and product details
        });

        return {
          orders: result.docs,
          total: result.totalDocs,
          page: input.page,
          totalPages: Math.ceil(result.totalDocs / input.limit),
          limit: input.limit,
        };
      }),

    /**
     * Get order statistics
     */
    stats: baseProcedure.query(async ({ ctx }) => {
      const vendorId = await getVendorIdFromSession(ctx);
      if (!vendorId) {
        throw new Error('Vendor not found. Please ensure you are logged in as a vendor.');
      }

      const allOrders = await ctx.payload.find({
        collection: 'orders',
        where: {
          supplier: { equals: vendorId },
        },
        limit: 1000,
      });

      const totalOrders = allOrders.totalDocs;
      const totalRevenue = allOrders.docs.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Count orders by status
      const ordersByStatus: Record<string, number> = {};
      allOrders.docs.forEach((order: any) => {
        const status = order.status || 'pending';
        ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
      });

      return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        ordersByStatus,
      };
    }),

    /**
     * Get single order
     */
    getOne: baseProcedure
      .input(z.object({ orderId: z.string() }))
      .query(async ({ ctx, input }) => {
        const vendorId = await getVendorIdFromSession(ctx);
        if (!vendorId) {
          throw new Error('Vendor not found. Please ensure you are logged in as a vendor.');
        }

        const order = await ctx.payload.findByID({
          collection: 'orders',
          id: input.orderId,
          depth: 2,
        });

        // Verify order belongs to this supplier
        const orderSupplierId = typeof order.supplier === 'object' ? order.supplier.id : order.supplier;
        if (orderSupplierId !== vendorId) {
          throw new Error('Order not found or access denied');
        }

        return order;
      }),

    /**
     * Update order status
     */
    updateStatus: baseProcedure
      .input(
        z.object({
          orderId: z.string(),
          status: z.string(),
          trackingNumber: z.string().optional(),
          deliveryDate: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const vendorId = await getVendorIdFromSession(ctx);
        if (!vendorId) {
          throw new Error('Vendor not found. Please ensure you are logged in as a vendor.');
        }

        const order = await ctx.payload.findByID({
          collection: 'orders',
          id: input.orderId,
        });

        // Verify order belongs to this supplier
        const orderSupplierId = typeof order.supplier === 'object' ? order.supplier.id : order.supplier;
        if (orderSupplierId !== vendorId) {
          throw new Error('Order not found or access denied');
        }

        const updateData: any = {
          status: input.status,
        };

        if (input.trackingNumber) {
          updateData.trackingNumber = input.trackingNumber;
        }

        if (input.deliveryDate) {
          updateData.deliveryDate = input.deliveryDate;
        }

        const updated = await ctx.payload.update({
          collection: 'orders',
          id: input.orderId,
          data: updateData,
        });

        return {
          order: updated,
          success: true,
          message: 'Order status updated successfully',
        };
      }),
  }),

  /**
   * Buyers management
   */
  buyers: createTRPCRouter({
    /**
     * List all buyers who have placed orders with this supplier
     */
    list: baseProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).optional().default(20),
          page: z.number().min(1).optional().default(1),
          search: z.string().optional(),
          sort: z.enum(['companyName', '-companyName', 'lastOrderDate', '-lastOrderDate', 'totalSpent', '-totalSpent']).optional().default('-lastOrderDate'),
        }),
      )
      .query(async ({ ctx, input }) => {
        const vendorId = await getVendorIdFromSession(ctx);
        if (!vendorId) {
          throw new Error('Vendor not found. Please ensure you are logged in as a vendor.');
        }

        // Get all orders for this supplier
        const allOrders = await ctx.payload.find({
          collection: 'orders',
          where: {
            supplier: { equals: vendorId },
          },
          limit: 1000,
          depth: 2,
        });

        // Group orders by buyer and calculate stats
        const buyerMap = new Map<string, {
          buyer: any;
          orderCount: number;
          totalSpent: number;
          lastOrderDate: string;
          lastOrder: any;
        }>();

        for (const order of allOrders.docs) {
          const buyerId = typeof order.buyer === 'object' ? order.buyer.id : order.buyer;
          if (!buyerId) continue;

          // Get buyer profile
          const buyerProfile = await ctx.payload.find({
            collection: 'buyers' as any,
            where: {
              user: { equals: buyerId },
            },
            limit: 1,
            depth: 1,
          });

          if (buyerProfile.docs.length === 0) continue;
          const buyer = buyerProfile.docs[0];

          const existing = buyerMap.get(buyerId);
          const orderDate = order.createdAt || '';
          const orderAmount = order.totalAmount || 0;

          if (existing) {
            existing.orderCount += 1;
            existing.totalSpent += orderAmount;
            if (orderDate > existing.lastOrderDate) {
              existing.lastOrderDate = orderDate;
              existing.lastOrder = order;
            }
          } else {
            buyerMap.set(buyerId, {
              buyer,
              orderCount: 1,
              totalSpent: orderAmount,
              lastOrderDate: orderDate,
              lastOrder: order,
            });
          }
        }

        // Convert to array and apply filters
        let buyers = Array.from(buyerMap.values());

        // Apply search filter
        if (input.search) {
          buyers = buyers.filter((item) => {
            const companyName = item.buyer.companyName || '';
            const email = typeof item.buyer.user === 'object' ? item.buyer.user.email || '' : '';
            return companyName.toLowerCase().includes(input.search!.toLowerCase()) ||
                   email.toLowerCase().includes(input.search!.toLowerCase());
          });
        }

        // Apply sorting
        if (input.sort === 'companyName') {
          buyers.sort((a, b) => (a.buyer.companyName || '').localeCompare(b.buyer.companyName || ''));
        } else if (input.sort === '-companyName') {
          buyers.sort((a, b) => (b.buyer.companyName || '').localeCompare(a.buyer.companyName || ''));
        } else if (input.sort === 'lastOrderDate') {
          buyers.sort((a, b) => a.lastOrderDate.localeCompare(b.lastOrderDate));
        } else if (input.sort === '-lastOrderDate') {
          buyers.sort((a, b) => b.lastOrderDate.localeCompare(a.lastOrderDate));
        } else if (input.sort === 'totalSpent') {
          buyers.sort((a, b) => a.totalSpent - b.totalSpent);
        } else if (input.sort === '-totalSpent') {
          buyers.sort((a, b) => b.totalSpent - a.totalSpent);
        }

        // Apply pagination
        const skip = (input.page - 1) * input.limit;
        const paginatedBuyers = buyers.slice(skip, skip + input.limit);

        return {
          buyers: paginatedBuyers,
          total: buyers.length,
          page: input.page,
          totalPages: Math.ceil(buyers.length / input.limit),
          limit: input.limit,
        };
      }),

    /**
     * Get buyer statistics
     */
    stats: baseProcedure.query(async ({ ctx }) => {
      const vendorId = await getVendorIdFromSession(ctx);
      if (!vendorId) {
        throw new Error('Vendor not found. Please ensure you are logged in as a vendor.');
      }

      // Get all orders for this supplier
      const allOrders = await ctx.payload.find({
        collection: 'orders',
        where: {
          supplier: { equals: vendorId },
        },
        limit: 1000,
      });

      // Count unique buyers
      const buyerIds = new Set<string>();
      allOrders.docs.forEach((order: any) => {
        const buyerId = typeof order.buyer === 'object' ? order.buyer.id : order.buyer;
        if (buyerId) buyerIds.add(buyerId);
      });

      return {
        totalBuyers: buyerIds.size,
        totalOrders: allOrders.totalDocs,
      };
    }),
  }),
});
