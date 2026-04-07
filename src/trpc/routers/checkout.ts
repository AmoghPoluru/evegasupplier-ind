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
          id: {
            in: input.ids,
          },
        },
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

      // Validate all products exist (Products collection has no isArchived field in schema)
      const uniqueProductIds = [...new Set(input.cartItems.map((item) => item.productId))];
      const products = await ctx.payload.find({
        collection: 'products',
        depth: 2,
        where: {
          id: {
            in: uniqueProductIds,
          },
        },
      });

      if (products.totalDocs !== uniqueProductIds.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Some products not found or are no longer available',
        });
      }

      const productById = new Map(
        products.docs.map((p: any) => [p.id as string, p]),
      );

      function supplierIdForProduct(p: any): string | null {
        const s = p?.supplier;
        if (!s) return null;
        return typeof s === 'string' ? s : s?.id ?? null;
      }

      // Group line items by supplier — multiple vendors ⇒ multiple orders (manual fulfillment)
      const itemsBySupplier = new Map<string, typeof input.cartItems>();
      for (const cartItem of input.cartItems) {
        const product = productById.get(cartItem.productId);
        if (!product) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Product ${cartItem.productId} not found`,
          });
        }
        const supplierId = supplierIdForProduct(product);
        if (!supplierId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Products must have a supplier assigned',
          });
        }
        const list = itemsBySupplier.get(supplierId) ?? [];
        list.push(cartItem);
        itemsBySupplier.set(supplierId, list);
      }

      const orderIds: string[] = [];

      for (const [supplierId, cartItems] of itemsBySupplier) {
        const vendor = await ctx.payload.findByID({
          collection: 'vendors',
          id: supplierId,
          depth: 0,
        });

        if (!vendor) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Supplier not found',
          });
        }

        let subtotal = 0;
        const orderProducts: Array<{
          product: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
        }> = [];

        for (const cartItem of cartItems) {
          const product = productById.get(cartItem.productId)!;
          const itemTotal = cartItem.unitPrice * cartItem.quantity;
          subtotal += itemTotal;
          orderProducts.push({
            product: product.id,
            quantity: cartItem.quantity,
            unitPrice: cartItem.unitPrice,
            totalPrice: itemTotal,
          });
        }

        const shipping = subtotal >= 75 ? 0 : 2.99;
        const tax = subtotal * 0.08;
        const totalAmount = subtotal + shipping + tax;

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

        orderIds.push(order.id);
      }

      return {
        orderIds,
        /** First order id — useful for single-order UIs */
        orderId: orderIds[0],
        orderNumber: orderIds[0],
      };
    }),
});
