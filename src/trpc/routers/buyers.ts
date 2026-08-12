import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { getPayload } from 'payload';
import config from '@payload-config';

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
          depth: 2,
        });

        return {
          orders: result.docs,
          total: result.totalDocs,
          page: input.page,
          totalPages: Math.ceil(result.totalDocs / input.limit),
          limit: input.limit,
        };
      }),

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

        const orderBuyerId = typeof order.buyer === 'object' ? order.buyer.id : order.buyer;
        if (orderBuyerId !== user.id) {
          throw new Error('Order not found or access denied');
        }

        return order;
      }),

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

    count: baseProcedure.query(async ({ ctx }) => {
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
});
