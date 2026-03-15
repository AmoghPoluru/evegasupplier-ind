import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { baseProcedure, createTRPCRouter } from '../init';

export const checkoutRouter = createTRPCRouter({
  // Get product details for cart items
  getProducts: baseProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const products = await ctx.payload.find({
        collection: 'products',
        depth: 2,
        where: {
          and: [
            {
              id: {
                in: input.ids,
              },
            },
            {
              isArchived: {
                not_equals: true,
              },
            },
          ],
        } as any,
      });

      return {
        docs: products.docs,
        totalDocs: products.totalDocs,
      };
    }),

  // Create order (no Stripe - offline payment only)
  createOrder: baseProcedure
    .input(
      z.object({
        cartItems: z.array(
          z.object({
            productId: z.string(),
            quantity: z.number().min(1),
            unitPrice: z.number().min(0),
          })
        ).min(1),
        phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
        shippingAddress: z.object({
          fullName: z.string().min(1),
          street: z.string().min(1),
          city: z.string().min(1),
          state: z.string().min(1),
          zipcode: z.string().min(1),
          country: z.string().optional().default('United States'),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get authenticated user
      const headersList = ctx.headers;
      const { user } = await ctx.payload.auth({ headers: headersList });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to place an order',
        });
      }

      // Get buyer profile
      const buyersResult = await ctx.payload.find({
        collection: 'buyers' as any,
        where: { user: { equals: user.id } },
        limit: 1,
      });

      const buyer = buyersResult.docs[0];
      if (!buyer) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Buyer profile not found. Please complete your buyer registration.',
        });
      }

      // Validate all products exist and are not archived
      const productIds = input.cartItems.map((item) => item.productId);
      const products = await ctx.payload.find({
        collection: 'products',
        depth: 2,
        where: {
          and: [
            {
              id: {
                in: productIds,
              },
            },
            {
              isArchived: {
                not_equals: true,
              },
            },
          ],
        } as any,
      });

      if (products.totalDocs !== productIds.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Some products not found or are no longer available',
        });
      }

      // Validate all products are from the same supplier
      const suppliers = new Set(
        products.docs
          .map((p: any) => {
            const supplier = p.supplier;
            return typeof supplier === 'string' ? supplier : supplier?.id;
          })
          .filter(Boolean)
      );

      if (suppliers.size === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Products must have a supplier assigned',
        });
      }

      if (suppliers.size > 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'All items in cart must be from the same supplier. Please complete your current order or remove items from different suppliers.',
        });
      }

      // Get supplier
      const supplierId = Array.from(suppliers)[0] as string;
      const supplier = await ctx.payload.findByID({
        collection: 'vendors',
        id: supplierId,
        depth: 0,
      });

      if (!supplier) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Supplier not found',
        });
      }

      // Calculate order totals
      let subtotal = 0;
      const orderProducts: Array<{
        product: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }> = [];

      for (const cartItem of input.cartItems) {
        const product = products.docs.find((p: any) => p.id === cartItem.productId);
        if (!product) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Product ${cartItem.productId} not found`,
          });
        }

        const itemTotal = cartItem.unitPrice * cartItem.quantity;
        subtotal += itemTotal;

        orderProducts.push({
          product: product.id,
          quantity: cartItem.quantity,
          unitPrice: cartItem.unitPrice,
          totalPrice: itemTotal,
        });
      }

      // Calculate shipping (simplified - can be enhanced later)
      const shipping = subtotal >= 75 ? 0 : 2.99; // Free shipping over $75
      const tax = subtotal * 0.08; // 8% tax (placeholder)
      const totalAmount = subtotal + shipping + tax;

      // Create order
      const order = await ctx.payload.create({
        collection: 'orders',
        data: {
          buyer: user.id,
          supplier: supplierId,
          orderType: 'standard',
          products: orderProducts.map((op) => ({
            product: op.product,
            quantity: op.quantity,
            unitPrice: op.unitPrice,
            totalPrice: op.totalPrice,
          })),
          totalAmount,
          status: 'pending',
          phoneNumber: input.phoneNumber,
          shippingAddress: {
            fullName: input.shippingAddress.fullName,
            street: input.shippingAddress.street,
            city: input.shippingAddress.city,
            state: input.shippingAddress.state,
            zipcode: input.shippingAddress.zipcode,
            country: input.shippingAddress.country || 'United States',
          },
        } as any,
      });

      return {
        orderId: order.id,
        orderNumber: (order as any).orderNumber || order.id,
      };
    }),
});
