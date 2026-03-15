import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { authRouter } from './auth';
import { vendorsRouter } from './vendors';
import { buyersRouter } from './buyers';
import { productsRouter } from './products';
import { checkoutRouter } from './checkout';
import { adminRouter } from './admin';

export const appRouter = createTRPCRouter({
  auth: authRouter,
  vendors: vendorsRouter,
  buyers: buyersRouter,
  products: productsRouter,
  checkout: checkoutRouter,
  admin: adminRouter,
  hello: baseProcedure
    .input(
      z.object({
        text: z.string().optional(),
      }),
    )
    .query((opts) => {
      return {
        greeting: `Hello ${opts.input.text ?? 'world'}!`,
      };
    }),
  
  getUsers: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.payload.find({
        collection: 'users',
        limit: input.limit,
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      
      return {
        users: users.docs,
        total: users.totalDocs,
      };
    }),
  
  getUser: baseProcedure
    .input(
      z.object({
        id: z.string().optional(),
        email: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!input.id && !input.email) {
        throw new Error('Either id or email must be provided');
      }
      
      const where: any = {};
      if (input.id) {
        where.id = { equals: input.id };
      }
      if (input.email) {
        where.email = { equals: input.email };
      }
      
      const result = await ctx.payload.find({
        collection: 'users',
        where,
        limit: 1,
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      
      if (result.docs.length === 0) {
        throw new Error('User not found');
      }
      
      return result.docs[0];
    }),
});

export type AppRouter = typeof appRouter;
