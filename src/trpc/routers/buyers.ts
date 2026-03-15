import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { getPayload } from 'payload';
import config from '@payload-config';

// Helper to get buyer ID from session
async function getBuyerIdFromSession(ctx: any): Promise<string | null> {
  try {
    const payload = ctx.payload || await getPayload({ config });
    const { user } = await payload.auth({ headers: ctx.headers });
    
    if (!user) return null;
    
    const buyersResult = await payload.find({
      collection: 'buyers',
      where: { user: { equals: user.id } },
      limit: 1,
    });
    
    return buyersResult.docs[0]?.id || null;
  } catch {
    return null;
  }
}

export const buyersRouter = createTRPCRouter({
  list: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        page: z.number().min(1).optional().default(1),
        verified: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.verified !== undefined) {
        where.verifiedBuyer = { equals: input.verified };
      }

      const result = await ctx.payload.find({
        collection: 'buyers' as any,
        where: where as any,
        limit: input.limit,
        page: input.page,
        sort: '-createdAt',
      });

      return {
        buyers: result.docs,
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
        page: result.page,
      };
    }),

    getById: baseProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const buyer = await ctx.payload.findByID({
          collection: 'buyers' as any,
          id: input.id,
        });
        return buyer;
      }),

  getByUser: baseProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.payload.find({
        collection: 'buyers' as any,
        where: { user: { equals: input.userId } },
        limit: 1,
      });
      return result.docs[0] ?? null;
    }),

  rfqs: createTRPCRouter({
    list: baseProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).optional().default(20),
          page: z.number().min(1).optional().default(1),
          status: z.enum(['all', 'draft', 'new', 'open', 'closed']).optional().default('all'),
        }),
      )
      .query(async ({ ctx, input }) => {
        const buyerId = await getBuyerIdFromSession(ctx);
        if (!buyerId) {
          throw new Error('Buyer not found. Please ensure you are logged in as a buyer.');
        }

        // RFQs collection uses buyer as user relationship
        const payload = ctx.payload || await getPayload({ config });
        const { user } = await payload.auth({ headers: ctx.headers });

        if (!user) {
          throw new Error('User not authenticated');
        }

        const where: Record<string, unknown> = {
          buyer: { equals: user.id },
        };

        if (input.status !== 'all') {
          where.status = { equals: input.status };
        }

        const result = await ctx.payload.find({
          collection: 'rfqs',
          where: where as any,
          limit: input.limit,
          page: input.page,
          sort: '-createdAt',
          depth: 2,
        });

        return {
          rfqs: result.docs,
          totalDocs: result.totalDocs,
          totalPages: result.totalPages,
          page: result.page,
        };
      }),

    create: baseProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          category: z.string().optional(),
          quantity: z.number().int().min(1).optional(),
          targetPrice: z.number().min(0).optional(),
          deliveryDate: z.string().optional(),
          deliveryLocation: z.string().optional(),
          paymentTerms: z.array(z.string()).optional(),
          specifications: z.array(z.object({
            name: z.string(),
            value: z.string(),
            unit: z.string().optional(),
            notes: z.string().optional(),
          })).optional(),
          specificationImages: z.array(z.string()).optional(),
          status: z.enum(['draft', 'new', 'open']).optional().default('new'),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload || await getPayload({ config });
        const { user } = await payload.auth({ headers: ctx.headers });

        if (!user) {
          throw new Error('User not authenticated');
        }

        const rfq = await ctx.payload.create({
          collection: 'rfqs',
          data: {
            ...input,
            buyer: user.id,
            isPublic: input.status !== 'draft',
            status: input.status === 'draft' ? 'draft' : 'new',
          } as any,
        });

        return rfq;
      }),

    saveDraft: baseProcedure
      .input(
        z.object({
          title: z.string().optional(),
          description: z.string().optional(),
          category: z.string().optional(),
          quantity: z.number().int().min(1).optional(),
          targetPrice: z.number().min(0).optional(),
          deliveryDate: z.string().optional(),
          deliveryLocation: z.string().optional(),
          paymentTerms: z.array(z.string()).optional(),
          specifications: z.array(z.object({
            name: z.string(),
            value: z.string(),
            unit: z.string().optional(),
            notes: z.string().optional(),
          })).optional(),
          specificationImages: z.array(z.string()).optional(),
          rfqId: z.string().optional(), // For updating existing draft
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload || await getPayload({ config });
        const { user } = await payload.auth({ headers: ctx.headers });

        if (!user) {
          throw new Error('User not authenticated');
        }

        const { rfqId, ...data } = input;

        if (rfqId) {
          // Update existing draft
          const existingRFQ = await ctx.payload.findByID({
            collection: 'rfqs',
            id: rfqId,
          });

          const existingBuyerId = typeof existingRFQ.buyer === 'string'
            ? existingRFQ.buyer
            : (existingRFQ.buyer as any)?.id;

          if (existingBuyerId !== user.id) {
            throw new Error('You do not have permission to update this RFQ');
          }

          const rfq = await ctx.payload.update({
            collection: 'rfqs',
            id: rfqId,
            data: {
              ...data,
              status: 'draft',
              isPublic: false,
            } as any,
          });

          return rfq;
        } else {
          // Create new draft
          const rfq = await ctx.payload.create({
            collection: 'rfqs',
            data: {
              ...data,
              buyer: user.id,
              status: 'draft',
              isPublic: false,
            } as any,
          });

          return rfq;
        }
      }),

    count: baseProcedure
      .query(async ({ ctx }) => {
        const payload = ctx.payload || await getPayload({ config });
        const { user } = await payload.auth({ headers: ctx.headers });

        if (!user) {
          return { count: 0 };
        }

        const result = await ctx.payload.find({
          collection: 'rfqs',
          where: { buyer: { equals: user.id } },
          limit: 0,
        });

        return { count: result.totalDocs };
      }),
  }),

  quotes: createTRPCRouter({
    list: baseProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).optional().default(20),
          page: z.number().min(1).optional().default(1),
          status: z.enum(['all', 'pending', 'accepted', 'rejected']).optional().default('all'),
          rfqId: z.string().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload || await getPayload({ config });
        const { user } = await payload.auth({ headers: ctx.headers });

        if (!user) {
          throw new Error('User not authenticated');
        }

        // Get buyer's RFQ IDs
        const rfqsResult = await ctx.payload.find({
          collection: 'rfqs',
          where: { buyer: { equals: user.id } },
          limit: 1000,
        });

        const rfqIds = rfqsResult.docs.map((rfq: any) => rfq.id);

        if (rfqIds.length === 0) {
          return {
            quotes: [],
            totalDocs: 0,
            totalPages: 0,
            page: 1,
          };
        }

        const where: Record<string, unknown> = {
          rfq: { in: rfqIds },
        };

        if (input.rfqId) {
          where.rfq = { equals: input.rfqId };
        }

        if (input.status !== 'all') {
          where.status = { equals: input.status };
        }

        const result = await ctx.payload.find({
          collection: 'quotes',
          where: where as any,
          limit: input.limit,
          page: input.page,
          sort: '-submittedAt',
          depth: 2,
        });

        return {
          quotes: result.docs,
          totalDocs: result.totalDocs,
          totalPages: result.totalPages,
          page: result.page,
        };
      }),

    accept: baseProcedure
      .input(z.object({ quoteId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload || await getPayload({ config });
        const { user } = await payload.auth({ headers: ctx.headers });

        if (!user) {
          throw new Error('User not authenticated');
        }

        // Verify quote's RFQ belongs to buyer
        const quote = await ctx.payload.findByID({
          collection: 'quotes',
          id: input.quoteId,
          depth: 2,
        });

        const rfqId = typeof quote.rfq === 'string' ? quote.rfq : (quote.rfq as any)?.id;
        const rfq = await ctx.payload.findByID({
          collection: 'rfqs',
          id: rfqId,
        });

        const rfqBuyerId = typeof rfq.buyer === 'string' ? rfq.buyer : (rfq.buyer as any)?.id;

        if (rfqBuyerId !== user.id) {
          throw new Error('You do not have permission to accept this quote');
        }

        // Update quote status
        const updatedQuote = await ctx.payload.update({
          collection: 'quotes',
          id: input.quoteId,
          data: { status: 'accepted' } as any,
        });

        // Update RFQ status and selected quote
        await ctx.payload.update({
          collection: 'rfqs',
          id: rfqId,
          data: {
            status: 'awarded',
            selectedQuote: input.quoteId,
          } as any,
        });

        return updatedQuote;
      }),

    reject: baseProcedure
      .input(
        z.object({
          quoteId: z.string(),
          reason: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload || await getPayload({ config });
        const { user } = await payload.auth({ headers: ctx.headers });

        if (!user) {
          throw new Error('User not authenticated');
        }

        // Verify quote's RFQ belongs to buyer
        const quote = await ctx.payload.findByID({
          collection: 'quotes',
          id: input.quoteId,
          depth: 2,
        });

        const rfqId = typeof quote.rfq === 'string' ? quote.rfq : (quote.rfq as any)?.id;
        const rfq = await ctx.payload.findByID({
          collection: 'rfqs',
          id: rfqId,
        });

        const rfqBuyerId = typeof rfq.buyer === 'string' ? rfq.buyer : (rfq.buyer as any)?.id;

        if (rfqBuyerId !== user.id) {
          throw new Error('You do not have permission to reject this quote');
        }

        // Update quote status
        const updatedQuote = await ctx.payload.update({
          collection: 'quotes',
          id: input.quoteId,
          data: {
            status: 'rejected',
            rejectionReason: input.reason,
          } as any,
        });

        return updatedQuote;
      }),

    count: baseProcedure
      .query(async ({ ctx }) => {
        const payload = ctx.payload || await getPayload({ config });
        const { user } = await payload.auth({ headers: ctx.headers });

        if (!user) {
          return { count: 0 };
        }

        const rfqsResult = await ctx.payload.find({
          collection: 'rfqs',
          where: { buyer: { equals: user.id } },
          limit: 1000,
        });

        const rfqIds = rfqsResult.docs.map((rfq: any) => rfq.id);

        if (rfqIds.length === 0) {
          return { count: 0 };
        }

        const result = await ctx.payload.find({
          collection: 'quotes',
          where: {
            rfq: { in: rfqIds },
            status: { equals: 'pending' },
          },
          limit: 0,
        });

        return { count: result.totalDocs };
      }),
  }),

  orders: createTRPCRouter({
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
        const payload = ctx.payload || await getPayload({ config });
        const { user } = await payload.auth({ headers: ctx.headers });

        if (!user) {
          throw new Error('User not authenticated');
        }

        const where: any = {
          buyer: { equals: user.id },
        };

        if (input.status) {
          where.status = { equals: input.status };
        }

        if (input.search) {
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
          depth: 2, // Include supplier and product details
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
     * Get single order
     */
    getOne: baseProcedure
      .input(z.object({ orderId: z.string() }))
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload || await getPayload({ config });
        const { user } = await payload.auth({ headers: ctx.headers });

        if (!user) {
          throw new Error('User not authenticated');
        }

        const order = await ctx.payload.findByID({
          collection: 'orders',
          id: input.orderId,
          depth: 2,
        });

        // Verify order belongs to this buyer
        const orderBuyerId = typeof order.buyer === 'object' ? order.buyer.id : order.buyer;
        if (orderBuyerId !== user.id) {
          throw new Error('Order not found or access denied');
        }

        return order;
      }),

    /**
     * Get order statistics
     */
    stats: baseProcedure.query(async ({ ctx }) => {
      const payload = ctx.payload || await getPayload({ config });
      const { user } = await payload.auth({ headers: ctx.headers });

      if (!user) {
        throw new Error('User not authenticated');
      }

      const allOrders = await ctx.payload.find({
        collection: 'orders',
        where: {
          buyer: { equals: user.id },
        },
        limit: 1000,
      });

      const totalOrders = allOrders.totalDocs;
      const totalSpent = allOrders.docs.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      // Count orders by status
      const ordersByStatus: Record<string, number> = {};
      allOrders.docs.forEach((order: any) => {
        const status = order.status || 'pending';
        ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
      });

      return {
        totalOrders,
        totalSpent,
        averageOrderValue,
        ordersByStatus,
      };
    }),

    count: baseProcedure
      .query(async ({ ctx }) => {
        const payload = ctx.payload || await getPayload({ config });
        const { user } = await payload.auth({ headers: ctx.headers });

        if (!user) {
          return { count: 0 };
        }

        const result = await ctx.payload.find({
          collection: 'orders',
          where: { buyer: { equals: user.id } },
          limit: 0,
        });

        return { count: result.totalDocs };
      }),
  }),

  inquiries: createTRPCRouter({
    list: baseProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).optional().default(20),
          page: z.number().min(1).optional().default(1),
          status: z.enum(['all', 'new', 'replied', 'closed']).optional().default('all'),
        }),
      )
      .query(async ({ ctx, input }) => {
        const buyerId = await getBuyerIdFromSession(ctx);
        if (!buyerId) {
          throw new Error('Buyer not found. Please ensure you are logged in as a buyer.');
        }

        // Inquiries collection uses buyer as user relationship
        const payload = ctx.payload || await getPayload({ config });
        const { user } = await payload.auth({ headers: ctx.headers });

        if (!user) {
          throw new Error('User not authenticated');
        }

        const where: Record<string, unknown> = {
          buyer: { equals: user.id },
        };

        if (input.status !== 'all') {
          where.status = { equals: input.status };
        }

        const result = await ctx.payload.find({
          collection: 'inquiries',
          where: where as any,
          limit: input.limit,
          page: input.page,
          sort: '-createdAt',
          depth: 2,
        });

        return {
          inquiries: result.docs,
          totalDocs: result.totalDocs,
          totalPages: result.totalPages,
          page: result.page,
        };
      }),

    create: baseProcedure
      .input(
        z.object({
          productId: z.string().optional(),
          supplierId: z.string().optional(),
          subject: z.string().min(1),
          message: z.string().min(1),
          inquiryType: z.enum(['product', 'general', 'quote']).optional().default('general'),
          attachments: z.array(z.string()).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const buyerId = await getBuyerIdFromSession(ctx);
        if (!buyerId) {
          throw new Error('Buyer not found. Please ensure you are logged in as a buyer.');
        }

        // Inquiries collection uses buyer as user relationship
        const payload = ctx.payload || await getPayload({ config });
        const { user } = await payload.auth({ headers: ctx.headers });

        if (!user) {
          throw new Error('User not authenticated');
        }

        if (!input.productId && !input.supplierId) {
          throw new Error('Either product or supplier must be specified');
        }

        const inquiry = await ctx.payload.create({
          collection: 'inquiries',
          data: {
            buyer: user.id,
            supplier: input.supplierId,
            product: input.productId,
            subject: input.subject,
            message: input.message,
            inquiryType: input.inquiryType,
            attachments: input.attachments,
            status: 'new',
          } as any,
        });

        return inquiry;
      }),

    count: baseProcedure
      .query(async ({ ctx }) => {
        const payload = ctx.payload || await getPayload({ config });
        const { user } = await payload.auth({ headers: ctx.headers });

        if (!user) {
          return { count: 0 };
        }

        const result = await ctx.payload.find({
          collection: 'inquiries',
          where: {
            buyer: { equals: user.id },
            status: { equals: 'new' },
          },
          limit: 0,
        });

        return { count: result.totalDocs };
      }),
  }),
});
