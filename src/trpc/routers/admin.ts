import { z } from 'zod';
import { createTRPCRouter, baseProcedure } from '../init';
import { checkIfAdmin } from '@/lib/auth/admin-check';
import { TRPCError } from '@trpc/server';

/**
 * Admin procedure that requires admin role
 */
const adminProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const payload = ctx.payload;
  const headers = ctx.headers;
  
  // Get session
  const session = await payload.auth({ headers });
  
  if (!session.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  
  // Check if user is admin
  if (!checkIfAdmin(session.user)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must be an admin to access this resource',
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      user: session.user,
    },
  });
});

export const adminRouter = createTRPCRouter({
  /**
   * Get dashboard statistics
   */
  dashboard: createTRPCRouter({
    stats: adminProcedure.query(async ({ ctx }) => {
      const payload = ctx.payload;
      
      // Get vendor statistics
      const vendorsResult = await payload.find({
        collection: 'vendors',
        limit: 0,
        where: {},
      });
      
      // Get all vendors and filter for pending (including null/undefined status)
      const allVendors = await payload.find({
        collection: 'vendors',
        limit: 1000,
      });
      
      const pendingVendors = {
        totalDocs: allVendors.docs.filter((v: any) => {
          const status = v.status;
          return status === 'pending' || status === null || status === undefined;
        }).length,
      };
      
      const approvedVendors = await payload.find({
        collection: 'vendors',
        limit: 0,
        where: {
          status: { equals: 'approved' },
        },
      });
      
      const rejectedVendors = await payload.find({
        collection: 'vendors',
        limit: 0,
        where: {
          status: { equals: 'rejected' },
        },
      });
      
      const suspendedVendors = await payload.find({
        collection: 'vendors',
        limit: 0,
        where: {
          status: { equals: 'suspended' },
        },
      });
      
      // Get order statistics
      const ordersResult = await payload.find({
        collection: 'orders',
        limit: 0,
        where: {},
      });
      
      // Get buyer statistics
      const buyersResult = await payload.find({
        collection: 'buyers' as any,
        limit: 0,
        where: {},
      });
      
      // Get product statistics
      const productsResult = await payload.find({
        collection: 'products',
        limit: 0,
        where: {},
      });
      
      // Calculate revenue (sum of all order totals)
      const allOrders = await payload.find({
        collection: 'orders',
        limit: 1000, // Adjust if needed
        where: {},
      });
      
      const revenue = allOrders.docs.reduce((sum, order) => {
        const total = (order as any).total;
        return sum + (typeof total === 'number' ? total : 0);
      }, 0);
      
      return {
        vendors: {
          total: vendorsResult.totalDocs,
          pending: pendingVendors.totalDocs,
          approved: approvedVendors.totalDocs,
          rejected: rejectedVendors.totalDocs,
          suspended: suspendedVendors.totalDocs,
        },
        orders: {
          total: ordersResult.totalDocs,
        },
        buyers: {
          total: buyersResult.totalDocs,
        },
        products: {
          total: productsResult.totalDocs,
        },
        revenue,
      };
    }),
  }),
  
  /**
   * Vendor management
   */
  vendors: createTRPCRouter({
    /**
     * List pending vendors
     */
    pending: adminProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).optional().default(20),
          page: z.number().min(1).optional().default(1),
        }),
      )
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload;
        const skip = (input.page - 1) * input.limit;
        
        // Find vendors with status 'pending' OR status is null/undefined (treat as pending)
        // First, get all vendors and filter in memory to handle null/undefined status
        const allVendors = await payload.find({
          collection: 'vendors',
          limit: 1000, // Get a large batch to filter
          sort: '-createdAt',
        });
        
        // Filter vendors where status is 'pending' or null/undefined
        const pendingVendors = allVendors.docs.filter((vendor: any) => {
          const status = vendor.status;
          return status === 'pending' || status === null || status === undefined;
        });
        
        // Apply pagination
        const paginatedVendors = pendingVendors.slice(skip, skip + input.limit);
        
        return {
          vendors: paginatedVendors,
          total: pendingVendors.length,
          page: input.page,
          totalPages: Math.ceil(pendingVendors.length / input.limit),
          limit: input.limit,
        };
      }),
    
    /**
     * List all vendors with filters
     */
    list: adminProcedure
      .input(
        z.object({
          status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
          isActive: z.boolean().optional(),
          companyType: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).optional().default(20),
          page: z.number().min(1).optional().default(1),
          sort: z.enum(['createdAt', '-createdAt', 'companyName', '-companyName', 'status', '-status']).optional().default('-createdAt'),
        }),
      )
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload;
        const skip = (input.page - 1) * input.limit;
        
        const where: any = {};
        
        if (input.status) {
          where.status = { equals: input.status };
        }
        
        if (input.isActive !== undefined) {
          where.isActive = { equals: input.isActive };
        }
        
        if (input.companyType) {
          where.companyType = { equals: input.companyType };
        }
        
        if (input.search) {
          where.or = [
            { companyName: { contains: input.search } },
          ];
        }
        
        const result = await payload.find({
          collection: 'vendors',
          where,
          limit: input.limit,
          page: input.page,
          sort: input.sort,
          depth: 1, // Include user relationship
        });
        
        // Get product and order counts for each vendor
        const vendorsWithCounts = await Promise.all(
          result.docs.map(async (vendor: any) => {
            const productsResult = await payload.find({
              collection: 'products',
              where: {
                supplier: { equals: vendor.id },
              },
              limit: 0,
            });
            
            const ordersResult = await payload.find({
              collection: 'orders',
              where: {
                supplier: { equals: vendor.id },
              },
              limit: 0,
            });
            
            return {
              ...vendor,
              productCount: productsResult.totalDocs,
              orderCount: ordersResult.totalDocs,
            };
          })
        );
        
        return {
          vendors: vendorsWithCounts,
          total: result.totalDocs,
          page: input.page,
          totalPages: Math.ceil(result.totalDocs / input.limit),
          limit: input.limit,
        };
      }),
    
    /**
     * Get single vendor details
     */
    getOne: adminProcedure
      .input(z.object({ vendorId: z.string() }))
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload;
        
        const vendor = await payload.findByID({
          collection: 'vendors',
          id: input.vendorId,
          depth: 2,
        });
        
        if (!vendor) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Vendor not found',
          });
        }
        
        return vendor;
      }),
    
    /**
     * Approve vendor
     */
    approve: adminProcedure
      .input(z.object({ vendorId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;
        
        // Check if vendor exists
        const vendor = await payload.findByID({
          collection: 'vendors',
          id: input.vendorId,
        });
        
        if (!vendor) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Vendor not found',
          });
        }
        
        // Update vendor
        const updated = await payload.update({
          collection: 'vendors',
          id: input.vendorId,
          data: {
            status: 'approved',
            isActive: true,
          } as any,
        });
        
        return {
          vendor: updated,
          success: true,
          message: 'Vendor approved successfully',
        };
      }),
    
    /**
     * Reject vendor
     */
    reject: adminProcedure
      .input(
        z.object({
          vendorId: z.string(),
          reason: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;
        
        // Check if vendor exists
        const vendor = await payload.findByID({
          collection: 'vendors',
          id: input.vendorId,
        });
        
        if (!vendor) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Vendor not found',
          });
        }
        
        // Update vendor
        const updateData: any = {
          status: 'rejected',
          isActive: false,
        };
        
        // Add rejection reason if field exists
        if (input.reason) {
          updateData.rejectionReason = input.reason;
        }
        
        const updated = await payload.update({
          collection: 'vendors',
          id: input.vendorId,
          data: updateData,
        });
        
        return {
          vendor: updated,
          success: true,
          message: 'Vendor rejected successfully',
        };
      }),
    
    /**
     * Suspend vendor
     */
    suspend: adminProcedure
      .input(
        z.object({
          vendorId: z.string(),
          reason: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;
        
        const vendor = await payload.findByID({
          collection: 'vendors',
          id: input.vendorId,
        });
        
        if (!vendor) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Vendor not found',
          });
        }
        
        const updateData: any = {
          status: 'suspended',
          isActive: false,
        };
        
        if (input.reason) {
          updateData.suspensionReason = input.reason;
        }
        
        const updated = await payload.update({
          collection: 'vendors',
          id: input.vendorId,
          data: updateData,
        });
        
        return {
          vendor: updated,
          success: true,
          message: 'Vendor suspended successfully',
        };
      }),
    
    /**
     * Activate vendor
     */
    activate: adminProcedure
      .input(z.object({ vendorId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;
        
        const vendor = await payload.findByID({
          collection: 'vendors',
          id: input.vendorId,
        });
        
        if (!vendor) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Vendor not found',
          });
        }
        
        const updated = await payload.update({
          collection: 'vendors',
          id: input.vendorId,
          data: {
            status: 'approved',
            isActive: true,
          } as any,
        });
        
        return {
          vendor: updated,
          success: true,
          message: 'Vendor activated successfully',
        };
      }),
    
    /**
     * Get recent vendors
     */
    recent: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional().default(10) }))
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload;
        
        const result = await payload.find({
          collection: 'vendors',
          limit: input.limit,
          sort: '-createdAt',
        });
        
        return result.docs;
      }),

    /**
     * Update vendor
     */
    update: adminProcedure
      .input(
        z.object({
          vendorId: z.string(),
          data: z.any(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;

        // Remove undefined values from data to avoid issues
        const cleanData: Record<string, any> = {};
        if (input.data && typeof input.data === 'object') {
          for (const [key, value] of Object.entries(input.data)) {
            if (value !== undefined) {
              cleanData[key] = value;
            }
          }
        }

        const vendor = await payload.update({
          collection: 'vendors',
          id: input.vendorId,
          data: cleanData as any,
        });

        return {
          vendor,
          success: true,
          message: 'Supplier updated successfully',
        };
      }),

    /**
     * Delete vendor with cascading deletion
     */
    delete: adminProcedure
      .input(z.object({ vendorId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const vendor = await payload.findByID({
          collection: 'vendors',
          id: input.vendorId,
          depth: 1,
        });

        if (!vendor) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Supplier not found',
          });
        }

        const userId = typeof vendor.user === 'object' ? vendor.user.id : vendor.user;
        const deletionSummary = {
          supplier: false,
          user: false,
          products: 0,
          catalogs: 0,
          orders: 0,
        };

        try {
          // 1. Delete all orders where supplier matches
          const ordersResult = await payload.find({
            collection: 'orders',
            where: {
              supplier: { equals: input.vendorId },
            },
            limit: 1000,
          });
          
          for (const order of ordersResult.docs) {
            await payload.delete({
              collection: 'orders',
              id: order.id,
            });
          }
          deletionSummary.orders = ordersResult.totalDocs;

          // 2. Delete all products where supplier matches
          const productsResult = await payload.find({
            collection: 'products',
            where: {
              supplier: { equals: input.vendorId },
            },
            limit: 1000,
          });
          
          for (const product of productsResult.docs) {
            // Delete associated media files if any
            if (product.images && Array.isArray(product.images)) {
              for (const image of product.images) {
                const imageId = typeof image === 'object' ? image.id : image;
                if (imageId) {
                  try {
                    await payload.delete({
                      collection: 'media',
                      id: imageId,
                    });
                  } catch (e) {
                    // Ignore media deletion errors
                  }
                }
              }
            }
            
            await payload.delete({
              collection: 'products',
              id: product.id,
            });
          }
          deletionSummary.products = productsResult.totalDocs;

          // 3. Delete all product catalogs where supplier matches
          const catalogsResult = await payload.find({
            collection: 'product-catalogs',
            where: {
              supplier: { equals: input.vendorId },
            },
            limit: 1000,
          });
          
          for (const catalog of catalogsResult.docs) {
            // Delete cover image if exists
            if (catalog.coverImage) {
              const coverImageId = typeof catalog.coverImage === 'object' ? catalog.coverImage.id : catalog.coverImage;
              if (coverImageId) {
                try {
                  await payload.delete({
                    collection: 'media',
                    id: coverImageId,
                  });
                } catch (e) {
                  // Ignore media deletion errors
                }
              }
            }
            
            await payload.delete({
              collection: 'product-catalogs',
              id: catalog.id,
            });
          }
          deletionSummary.catalogs = catalogsResult.totalDocs;

          // 4. Delete supplier profile
          await payload.delete({
            collection: 'vendors',
            id: input.vendorId,
          });
          deletionSummary.supplier = true;

          // 5. Check if user has other profiles (buyer profile)
          if (userId) {
            const buyerProfile = await payload.find({
              collection: 'buyers' as any,
              where: {
                user: { equals: userId },
              },
              limit: 1,
            });

            if (buyerProfile.totalDocs === 0) {
              // No buyer profile, safe to delete user
              await payload.delete({
                collection: 'users',
                id: userId,
              });
              deletionSummary.user = true;
            }
            // If buyer profile exists, keep user but remove vendor role
          }
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to delete supplier: ${error.message}`,
          });
        }

        return {
          success: true,
          message: 'Supplier and all related data deleted successfully',
          deleted: deletionSummary,
        };
      }),
  }),
  
  /**
   * Buyer management
   */
  buyers: createTRPCRouter({
    /**
     * Get pending buyers
     */
    pending: adminProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).optional().default(20),
          page: z.number().min(1).optional().default(1),
        }),
      )
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const result = await payload.find({
          collection: 'buyers' as any,
          where: {
            verificationStatus: { equals: 'pending' },
          } as any,
          limit: input.limit,
          page: input.page,
          sort: '-createdAt',
          depth: 2,
        });

        return {
          buyers: result.docs,
          total: result.totalDocs,
          totalPages: result.totalPages,
          page: result.page,
        };
      }),

    /**
     * List all buyers
     */
    list: adminProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).optional().default(20),
          page: z.number().min(1).optional().default(1),
          status: z.enum(['all', 'pending', 'verified', 'rejected']).optional().default('all'),
          search: z.string().optional(),
          companyType: z.string().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const where: Record<string, unknown> = {};
        if (input.status !== 'all') {
          where.verificationStatus = { equals: input.status };
        }
        
        if (input.search) {
          where.or = [
            { companyName: { contains: input.search } },
          ];
        }
        
        if (input.companyType) {
          where.companyType = { equals: input.companyType };
        }

        const result = await payload.find({
          collection: 'buyers' as any,
          where: where as any,
          limit: input.limit,
          page: input.page,
          sort: '-createdAt',
          depth: 1, // Include user relationship
        });

        // Get order counts for each buyer
        const buyersWithCounts = await Promise.all(
          result.docs.map(async (buyer: any) => {
            const userId = typeof buyer.user === 'object' ? buyer.user.id : buyer.user;
            if (!userId) {
              return {
                ...buyer,
                orderCount: 0,
              };
            }
            
            const ordersResult = await payload.find({
              collection: 'orders',
              where: {
                buyer: { equals: userId },
              },
              limit: 0,
            });
            
            return {
              ...buyer,
              orderCount: ordersResult.totalDocs,
            };
          })
        );

        return {
          buyers: buyersWithCounts,
          total: result.totalDocs,
          totalPages: result.totalPages,
          page: result.page,
        };
      }),

    /**
     * Get one buyer
     */
    getOne: adminProcedure
      .input(z.object({ buyerId: z.string() }))
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const buyer = await payload.findByID({
          collection: 'buyers' as any,
          id: input.buyerId,
          depth: 2,
        });

        // Get order count for this buyer
        const userId = typeof buyer.user === 'object' ? buyer.user.id : buyer.user;
        const ordersResult = await payload.find({
          collection: 'orders',
          where: {
            buyer: { equals: userId },
          },
          limit: 0,
        });

        return {
          ...(buyer as any),
          orderCount: ordersResult.totalDocs,
        };
      }),

    /**
     * Approve buyer
     */
    approve: adminProcedure
      .input(z.object({ buyerId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const buyer = await payload.update({
          collection: 'buyers' as any,
          id: input.buyerId,
          data: {
            verificationStatus: 'verified',
            verifiedBuyer: true,
          } as any,
        });

        return buyer;
      }),

    /**
     * Reject buyer
     */
    reject: adminProcedure
      .input(
        z.object({
          buyerId: z.string(),
          reason: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const buyer = await payload.update({
          collection: 'buyers' as any,
          id: input.buyerId,
          data: {
            verificationStatus: 'rejected',
            verifiedBuyer: false,
          } as any,
        });

        return buyer;
      }),

    /**
     * Get recent buyers
     */
    recent: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional().default(10) }))
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const result = await payload.find({
          collection: 'buyers' as any,
          limit: input.limit,
          sort: '-createdAt',
          depth: 2,
        });

        return result.docs;
      }),

    /**
     * Update buyer
     */
    update: adminProcedure
      .input(
        z.object({
          buyerId: z.string(),
          data: z.any(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;

        // Remove undefined values from data to avoid issues
        const cleanData: Record<string, any> = {};
        if (input.data && typeof input.data === 'object') {
          for (const [key, value] of Object.entries(input.data)) {
            if (value !== undefined) {
              cleanData[key] = value;
            }
          }
        }

        const buyer = await payload.update({
          collection: 'buyers' as any,
          id: input.buyerId,
          data: cleanData as any,
        });

        return {
          buyer,
          success: true,
          message: 'Buyer updated successfully',
        };
      }),

    /**
     * Delete buyer with cascading deletion
     */
    delete: adminProcedure
      .input(z.object({ buyerId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const buyer = await payload.findByID({
          collection: 'buyers' as any,
          id: input.buyerId,
          depth: 1,
        });

        if (!buyer) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Buyer not found',
          });
        }

        const userId = typeof buyer.user === 'object' ? buyer.user.id : buyer.user;
        const deletionSummary = {
          buyer: false,
          user: false,
          orders: 0,
        };

        try {
          // 1. Delete all orders where buyer matches
          if (userId) {
            const ordersResult = await payload.find({
              collection: 'orders',
              where: {
                buyer: { equals: userId },
              },
              limit: 1000,
            });
            
            for (const order of ordersResult.docs) {
              await payload.delete({
                collection: 'orders',
                id: order.id,
              });
            }
            deletionSummary.orders = ordersResult.totalDocs;
          }

          // 2. Delete buyer profile
          await payload.delete({
            collection: 'buyers' as any,
            id: input.buyerId,
          });
          deletionSummary.buyer = true;

          // 3. Check if user has other profiles (supplier/vendor profile)
          if (userId) {
            const vendorProfile = await payload.find({
              collection: 'vendors',
              where: {
                user: { equals: userId },
              },
              limit: 1,
            });

            if (vendorProfile.totalDocs === 0) {
              // No vendor profile, safe to delete user
              await payload.delete({
                collection: 'users',
                id: userId,
              });
              deletionSummary.user = true;
            }
            // If vendor profile exists, keep user but remove buyer role
          }
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to delete buyer: ${error.message}`,
          });
        }

        return {
          success: true,
          message: 'Buyer and all related data deleted successfully',
          deleted: deletionSummary,
        };
      }),
  }),

  /**
   * Order management
   */
  orders: createTRPCRouter({
    /**
     * Get recent orders
     */
    recent: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional().default(10) }))
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload;
        
        const result = await payload.find({
          collection: 'orders',
          limit: input.limit,
          sort: '-createdAt',
          depth: 2,
        });
        
        return result.docs;
      }),
  }),
});
