import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { headers as getHeaders } from 'next/headers';
import { baseProcedure, createTRPCRouter } from '../init';
import { generateAuthCookie, clearAuthCookie } from '@/lib/auth-utils';

export const authRouter = createTRPCRouter({
  session: baseProcedure.query(async ({ ctx }) => {
    const headers = await getHeaders();
    const session = await ctx.payload.auth({ headers });
    // Ensure user role is included in the response
    if (session.user) {
      try {
        // Fetch full user to get role field
        const fullUser = await ctx.payload.findByID({
          collection: 'users',
          id: typeof session.user.id === 'string' ? session.user.id : String(session.user.id),
          depth: 0,
        });
        return {
          ...session,
          user: fullUser,
        };
      } catch (error) {
        console.error('Error fetching full user in session:', error);
        // Fallback to session user if fetch fails
        return session;
      }
    }
    return session;
  }),

  register: baseProcedure
    .input(
      z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUsers = await ctx.payload.find({
        collection: 'users',
        where: {
          email: {
            equals: input.email,
          },
        },
        limit: 1,
      });

      if (existingUsers.docs.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User with this email already exists',
        });
      }

      // Create user
      await ctx.payload.create({
        collection: 'users',
        data: {
          name: input.name,
          email: input.email,
          password: input.password,
          role: 'user', // Default role
        },
      });

      // Login the user after registration
      const data = await ctx.payload.login({
        collection: 'users',
        data: {
          email: input.email,
          password: input.password,
        },
      });

      if (!data.token) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Failed to login after registration',
        });
      }

      // Set the authentication cookie
      await generateAuthCookie({
        prefix: ctx.payload.config.cookiePrefix,
        value: data.token,
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = data.user;
      return {
        user: userWithoutPassword,
      };
    }),

  login: baseProcedure
    .input(
      z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(1, 'Password is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const data = await ctx.payload.login({
          collection: 'users',
          data: {
            email: input.email,
            password: input.password,
          },
        });

        if (!data.token) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          });
        }

        // Set the authentication cookie
        await generateAuthCookie({
          prefix: ctx.payload.config.cookiePrefix,
          value: data.token,
        });

        // Return user without password
        const { password: _, ...userWithoutPassword } = data.user;
        return {
          user: userWithoutPassword,
          token: data.token,
        };
      } catch (error) {
        // Re-throw TRPCErrors as-is (they already have user-friendly messages)
        if (error instanceof TRPCError) {
          throw error;
        }

        // For any other errors (including Payload authentication errors),
        // throw a user-friendly error message
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }
    }),

  logout: baseProcedure.mutation(async ({ ctx }) => {
    await clearAuthCookie({
      prefix: ctx.payload.config.cookiePrefix,
    });
    return { success: true };
  }),

  getCurrentUser: baseProcedure.query(async ({ ctx }) => {
    const headers = await getHeaders();
    const session = await ctx.payload.auth({ headers });

    if (!session.user) {
      return null;
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = session.user;
    return userWithoutPassword;
  }),

  /**
   * Get user profile status (buyer and supplier)
   */
  profileStatus: baseProcedure.query(async ({ ctx }) => {
      const headers = await getHeaders();
      const session = await ctx.payload.auth({ headers });

      if (!session.user) {
        return {
          hasBuyer: false,
          hasSupplier: false,
          buyer: null,
          supplier: null,
          buyerStatus: null,
          supplierStatus: null,
        };
      }

      // Find buyer associated with this user
      const buyersResult = await ctx.payload.find({
        collection: 'buyers' as any,
        where: { user: { equals: session.user.id } },
        limit: 1,
      });

      const buyer = buyersResult.docs[0] ?? null;
      const buyerStatus = buyer
        ? (buyer.verificationStatus || (buyer.verifiedBuyer ? 'approved' : 'pending'))
        : null;

      // Find supplier (vendor) associated with this user
      const vendorsResult = await ctx.payload.find({
        collection: 'vendors' as any,
        where: { user: { equals: session.user.id } },
        limit: 1,
      });

      const supplier = vendorsResult.docs[0] ?? null;
      const supplierStatus = supplier
        ? (supplier.status || (supplier.isActive ? 'approved' : 'pending'))
        : null;

      return {
        hasBuyer: !!buyer,
        hasSupplier: !!supplier,
        buyer,
        supplier,
        buyerStatus,
        supplierStatus,
      };
  }),

  /**
   * Registration for buyer profile
   */
  registerBuyer: baseProcedure
      .input(
        z.object({
          companyName: z.string().min(1, 'Company name is required'),
          companyType: z.enum(['retailer', 'wholesaler', 'distributor', 'manufacturer', 'ecommerce', 'other']),
          businessRegistrationNumber: z.string().optional(),
          taxId: z.string().optional(),
          companyWebsite: z.string().url().optional().or(z.literal('')),
          companyAddress: z.object({
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zipcode: z.string().optional(),
            country: z.string().optional(),
          }).optional(),
          companyPhone: z.string().optional(),
          companyEmail: z.string().email().optional().or(z.literal('')),
          annualPurchaseVolume: z.string().optional(),
          mainBusiness: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const headers = await getHeaders();
        const session = await ctx.payload.auth({ headers });

        if (!session.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to register as a buyer',
          });
        }

        // Check if user already has buyer profile
        const existingBuyers = await ctx.payload.find({
          collection: 'buyers' as any,
          where: { user: { equals: session.user.id } },
          limit: 1,
        });

        if (existingBuyers.docs.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'You already have a buyer profile',
          });
        }

        // Check for duplicate company name (case-insensitive)
        const duplicateBuyers = await ctx.payload.find({
          collection: 'buyers' as any,
          where: {
            companyName: {
              contains: input.companyName,
            },
          },
          limit: 1,
        });

        if (duplicateBuyers.docs.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A buyer with this company name already exists',
          });
        }

        // Format company address as string if provided
        let companyAddressString: string | undefined = undefined;
        if (input.companyAddress) {
          const addr = input.companyAddress;
          const parts = [
            addr.street,
            addr.city,
            addr.state,
            addr.zipcode,
            addr.country,
          ].filter(Boolean);
          companyAddressString = parts.join(', ');
        }

        // Create buyer profile
        const buyer = await ctx.payload.create({
          collection: 'buyers' as any,
          data: {
            user: session.user.id,
            companyName: input.companyName,
            companyType: input.companyType,
            businessRegistrationNumber: input.businessRegistrationNumber,
            taxId: input.taxId,
            companyWebsite: input.companyWebsite || undefined,
            companyAddress: companyAddressString,
            companyPhone: input.companyPhone,
            companyEmail: input.companyEmail || undefined,
            annualPurchaseVolume: input.annualPurchaseVolume,
            mainBusiness: input.mainBusiness,
            verificationStatus: 'pending',
            verifiedBuyer: false,
          },
        });

        return { buyer };
  }),

  /**
   * Registration for supplier profile
   */
  registerSupplier: baseProcedure
      .input(
        z.object({
          companyName: z.string().min(1, 'Company name is required'),
          companyType: z.enum(['manufacturer', 'trading', 'agent', 'distributor', 'other']),
          businessRegistrationNumber: z.string().optional(),
          taxId: z.string().optional(),
          companyWebsite: z.string().url().optional().or(z.literal('')),
          yearEstablished: z.number().optional(),
          employeeCount: z.string().optional(),
          mainMarkets: z.array(z.string()).optional(),
          mainProducts: z.array(z.string()).optional(),
          factoryLocation: z.string().optional(),
          companyDescription: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const headers = await getHeaders();
        const session = await ctx.payload.auth({ headers });

        if (!session.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to register as a supplier',
          });
        }

        // Check if user already has supplier profile
        const existingVendors = await ctx.payload.find({
          collection: 'vendors' as any,
          where: { user: { equals: session.user.id } },
          limit: 1,
        });

        if (existingVendors.docs.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'You already have a supplier profile',
          });
        }

        // Check for duplicate company name (case-insensitive)
        const duplicateVendors = await ctx.payload.find({
          collection: 'vendors' as any,
          where: {
            companyName: {
              contains: input.companyName,
            },
          },
          limit: 1,
        });

        if (duplicateVendors.docs.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A supplier with this company name already exists',
          });
        }

        // Create supplier (vendor) profile
        const supplier = await ctx.payload.create({
          collection: 'vendors' as any,
          data: {
            user: session.user.id,
            companyName: input.companyName,
            companyType: input.companyType,
            businessRegistrationNumber: input.businessRegistrationNumber,
            taxId: input.taxId,
            companyWebsite: input.companyWebsite || undefined,
            yearEstablished: input.yearEstablished,
            employeeCount: input.employeeCount,
            mainMarkets: input.mainMarkets,
            mainProducts: input.mainProducts,
            factoryLocation: input.factoryLocation,
            companyDescription: input.companyDescription,
            status: 'pending',
            isActive: false,
          },
        });

        return { supplier };
  }),
});
