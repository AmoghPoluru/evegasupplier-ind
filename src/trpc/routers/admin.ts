import { z } from "zod";
import { ValidationError } from "payload";
import { createTRPCRouter, baseProcedure } from "../init";
import { checkIfAdmin } from "@/lib/auth/admin-check";
import { TRPCError } from "@trpc/server";
import {
  adminProductCreateInputSchema,
  adminProductUpdateFullInputSchema,
  toPayloadProductData,
} from "@/lib/admin-product-form-schema";
import { toAdminUserView } from "@/lib/admin-user-types";

const userRoleSchema = z.enum(["user", "vendor", "buyer", "admin", "bdo"]);
const oauthProviderSchema = z.enum(["email", "google", "facebook"]);

async function assertCanDeleteUser(
  payload: { find: Function; findByID: Function },
  targetUserId: string,
  currentUserId: string,
) {
  if (targetUserId === currentUserId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You cannot delete your own account while logged in",
    });
  }

  const target = await payload.findByID({
    collection: "users",
    id: targetUserId,
  });

  if ((target as { role?: string }).role === "admin") {
    const admins = await payload.find({
      collection: "users",
      where: { role: { equals: "admin" } },
      limit: 2,
    });
    if (admins.totalDocs <= 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot delete the last admin account",
      });
    }
  }

  const [supplierProfile, buyerProfile] = await Promise.all([
    payload.find({
      collection: "suppliers",
      where: { user: { equals: targetUserId } },
      limit: 1,
    }),
    payload.find({
      collection: "buyers",
      where: { user: { equals: targetUserId } },
      limit: 1,
    }),
  ]);

  if (supplierProfile.totalDocs > 0 || buyerProfile.totalDocs > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Delete linked supplier or buyer profiles before deleting this user",
    });
  }
}

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
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  // Check if user is admin
  if (!checkIfAdmin(session.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin to access this resource",
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

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        vendorsTotal,
        buyersTotal,
        buyersPending,
        productsTotal,
        ordersTotal,
        ordersOpen,
        revenueOrders,
      ] = await Promise.all([
        payload.find({ collection: 'suppliers', limit: 0, where: {} }),
        payload.find({ collection: 'buyers', limit: 0, where: {} }),
        payload.find({
          collection: 'buyers',
          limit: 0,
          where: { verificationStatus: { equals: 'pending' } },
        }),
        payload.find({ collection: 'products', limit: 0, where: {} }),
        payload.find({ collection: 'orders', limit: 0, where: {} }),
        payload.find({
          collection: 'orders',
          limit: 0,
          where: {
            status: {
              not_in: ['completed', 'cancelled', 'delivered'],
            },
          },
        }),
        payload.find({
          collection: 'orders',
          limit: 500,
          sort: '-createdAt',
          where: {},
        }),
      ]);

      const sumOrderTotals = (docs: { totalAmount?: number | null }[]) =>
        docs.reduce(
          (sum, order) =>
            sum + (typeof order.totalAmount === 'number' ? order.totalAmount : 0),
          0,
        );

      const revenueAllTime = sumOrderTotals(revenueOrders.docs);
      const revenue30d = sumOrderTotals(
        revenueOrders.docs.filter((order) => {
          if (!order.createdAt) return false;
          return new Date(order.createdAt) >= thirtyDaysAgo;
        }),
      );

      return {
        vendors: {
          total: vendorsTotal.totalDocs,
        },
        buyers: {
          total: buyersTotal.totalDocs,
          pending: buyersPending.totalDocs,
        },
        products: {
          total: productsTotal.totalDocs,
        },
        orders: {
          total: ordersTotal.totalDocs,
          open: ordersOpen.totalDocs,
        },
        revenue: {
          allTime: revenueAllTime,
          last30Days: revenue30d,
        },
      };
    }),
  }),

  /**
   * Vendor management
   */
  vendors: createTRPCRouter({
    /**
     * List all vendors with filters
     */
    list: adminProcedure
      .input(
        z.object({
          status: z
            .enum(["pending", "approved", "rejected", "suspended"])
            .optional(),
          isActive: z.boolean().optional(),
          companyType: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).optional().default(20),
          page: z.number().min(1).optional().default(1),
          sort: z
            .enum([
              "createdAt",
              "-createdAt",
              "companyName",
              "-companyName",
              "status",
              "-status",
            ])
            .optional()
            .default("-createdAt"),
        })
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
          where.or = [{ companyName: { contains: input.search } }];
        }

        const result = await payload.find({
          collection: "suppliers",
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
              collection: "products",
              where: {
                supplier: { equals: vendor.id },
              },
              limit: 0,
            });

            const ordersResult = await payload.find({
              collection: "orders",
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
          collection: "suppliers",
          id: input.vendorId,
          depth: 2,
          overrideAccess: true,
          showHiddenFields: true,
          user: ctx.user,
        });

        if (!vendor) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Vendor not found",
          });
        }

        return vendor;
      }),

    /**
     * Create supplier (user account + supplier profile)
     */
    create: adminProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(8, 'Password must be at least 8 characters'),
          name: z.string().min(1).optional(),
          companyName: z.string().min(1, 'Company name is required'),
          companyType: z
            .enum(['manufacturer', 'trading', 'agent', 'distributor', 'other'])
            .optional(),
          factoryLocation: z.string().optional(),
          status: z
            .enum(['pending', 'approved', 'rejected', 'suspended'])
            .optional()
            .default('approved'),
          isActive: z.boolean().optional().default(true),
          verifiedSupplier: z.boolean().optional().default(false),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;
        const email = input.email.trim().toLowerCase();

        const existingUsers = await payload.find({
          collection: 'users',
          where: { email: { equals: email } },
          limit: 1,
        });

        let userId: string;

        if (existingUsers.docs.length > 0) {
          const existingUser = existingUsers.docs[0]!;
          userId = String(existingUser.id);

          const existingVendor = await payload.find({
            collection: 'suppliers',
            where: { user: { equals: userId } },
            limit: 1,
          });

          if (existingVendor.docs.length > 0) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'This email already has a supplier profile',
            });
          }

          const role = (existingUser as { role?: string }).role;
          if (role !== 'admin' && role !== 'bdo' && role !== 'vendor') {
            await payload.update({
              collection: 'users',
              id: userId,
              data: { role: 'vendor' },
            });
          }
        } else {
          const user = await payload.create({
            collection: 'users',
            data: {
              email,
              password: input.password,
              name: input.name?.trim() || input.companyName.trim(),
              role: 'vendor',
              oauthProvider: 'email',
            },
          });
          userId = String(user.id);
        }

        const vendor = await payload.create({
          collection: 'suppliers',
          data: {
            user: userId,
            companyName: input.companyName.trim(),
            companyType: input.companyType,
            factoryLocation: input.factoryLocation?.trim() || undefined,
            status: input.status,
            isActive: input.isActive,
            verifiedSupplier: input.verifiedSupplier,
          },
        });

        return {
          vendor,
          success: true as const,
          message: 'Supplier created successfully',
        };
      }),

    /**
     * Get recent vendors
     */
    recent: adminProcedure
      .input(
        z.object({ limit: z.number().min(1).max(50).optional().default(10) })
      )
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const result = await payload.find({
          collection: "suppliers",
          limit: input.limit,
          sort: "-createdAt",
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;

        // Remove undefined values from data to avoid issues
        const cleanData: Record<string, any> = {};
        if (input.data && typeof input.data === "object") {
          for (const [key, value] of Object.entries(input.data)) {
            if (value !== undefined) {
              cleanData[key] = value;
            }
          }
        }

        // Empty string → clear optional text fields (Payload prefers null/omit)
        if (
          typeof cleanData.openaiApiKey === "string" &&
          !cleanData.openaiApiKey.trim()
        ) {
          cleanData.openaiApiKey = null;
        }

        try {
          const vendor = await payload.update({
            collection: "suppliers",
            id: input.vendorId,
            data: cleanData as any,
            overrideAccess: true,
            user: ctx.user,
          });

          return {
            vendor,
            success: true,
            message: "Supplier updated successfully",
          };
        } catch (e: unknown) {
          const message =
            e instanceof Error ? e.message : "Failed to update supplier";
          console.error("[admin.vendors.update]", message, e);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message,
          });
        }
      }),

    /**
     * Delete vendor with cascading deletion
     */
    delete: adminProcedure
      .input(z.object({ vendorId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const vendor = await payload.findByID({
          collection: "suppliers",
          id: input.vendorId,
          depth: 1,
        });

        if (!vendor) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Supplier not found",
          });
        }

        const userId =
          typeof vendor.user === "object" ? vendor.user.id : vendor.user;
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
            collection: "orders",
            where: {
              supplier: { equals: input.vendorId },
            },
            limit: 1000,
          });

          for (const order of ordersResult.docs) {
            await payload.delete({
              collection: "orders",
              id: order.id,
            });
          }
          deletionSummary.orders = ordersResult.totalDocs;

          // 2. Delete all products where supplier matches
          const productsResult = await payload.find({
            collection: "products",
            where: {
              supplier: { equals: input.vendorId },
            },
            limit: 1000,
          });

          for (const product of productsResult.docs) {
            // Delete associated media files if any
            if (product.images && Array.isArray(product.images)) {
              for (const image of product.images) {
                const imageId = typeof image === "object" ? image.id : image;
                if (imageId) {
                  try {
                    await payload.delete({
                      collection: "media",
                      id: imageId,
                    });
                  } catch (e) {
                    // Ignore media deletion errors
                  }
                }
              }
            }

            await payload.delete({
              collection: "products",
              id: product.id,
            });
          }
          deletionSummary.products = productsResult.totalDocs;

          // 3. Delete all product catalogs where supplier matches
          const catalogsResult = await payload.find({
            collection: "product-catalogs",
            where: {
              supplier: { equals: input.vendorId },
            },
            limit: 1000,
          });

          for (const catalog of catalogsResult.docs) {
            // Delete cover image if exists
            if (catalog.coverImage) {
              const coverImageId =
                typeof catalog.coverImage === "object"
                  ? catalog.coverImage.id
                  : catalog.coverImage;
              if (coverImageId) {
                try {
                  await payload.delete({
                    collection: "media",
                    id: coverImageId,
                  });
                } catch (e) {
                  // Ignore media deletion errors
                }
              }
            }

            await payload.delete({
              collection: "product-catalogs",
              id: catalog.id,
            });
          }
          deletionSummary.catalogs = catalogsResult.totalDocs;

          // 4. Delete supplier profile
          await payload.delete({
            collection: "suppliers",
            id: input.vendorId,
          });
          deletionSummary.supplier = true;

          // 5. Check if user has other profiles (buyer profile)
          if (userId) {
            const buyerProfile = await payload.find({
              collection: "buyers" as any,
              where: {
                user: { equals: userId },
              },
              limit: 1,
            });

            if (buyerProfile.totalDocs === 0) {
              // No buyer profile, safe to delete user
              await payload.delete({
                collection: "users",
                id: userId,
              });
              deletionSummary.user = true;
            }
            // If buyer profile exists, keep user but remove vendor role
          }
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to delete supplier: ${error.message}`,
          });
        }

        return {
          success: true,
          message: "Supplier and all related data deleted successfully",
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
        })
      )
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const result = await payload.find({
          collection: "buyers" as any,
          where: {
            verificationStatus: { equals: "pending" },
          } as any,
          limit: input.limit,
          page: input.page,
          sort: "-createdAt",
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
          status: z
            .enum(["all", "pending", "verified", "rejected"])
            .optional()
            .default("all"),
          search: z.string().optional(),
          companyType: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const where: Record<string, unknown> = {};
        if (input.status !== "all") {
          where.verificationStatus = { equals: input.status };
        }

        if (input.search) {
          where.or = [{ companyName: { contains: input.search } }];
        }

        if (input.companyType) {
          where.companyType = { equals: input.companyType };
        }

        const result = await payload.find({
          collection: "buyers" as any,
          where: where as any,
          limit: input.limit,
          page: input.page,
          sort: "-createdAt",
          depth: 1, // Include user relationship
        });

        // Get order counts for each buyer
        const buyersWithCounts = await Promise.all(
          result.docs.map(async (buyer: any) => {
            const userId =
              typeof buyer.user === "object" ? buyer.user.id : buyer.user;
            if (!userId) {
              return {
                ...buyer,
                orderCount: 0,
              };
            }

            const ordersResult = await payload.find({
              collection: "orders",
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
          collection: "buyers" as any,
          id: input.buyerId,
          depth: 2,
        });

        // Get order count for this buyer
        const userId =
          typeof buyer.user === "object" ? buyer.user.id : buyer.user;
        const ordersResult = await payload.find({
          collection: "orders",
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
          collection: "buyers" as any,
          id: input.buyerId,
          data: {
            verificationStatus: "verified",
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const buyer = await payload.update({
          collection: "buyers" as any,
          id: input.buyerId,
          data: {
            verificationStatus: "rejected",
            verifiedBuyer: false,
          } as any,
        });

        return buyer;
      }),

    /**
     * Get recent buyers
     */
    recent: adminProcedure
      .input(
        z.object({ limit: z.number().min(1).max(50).optional().default(10) })
      )
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const result = await payload.find({
          collection: "buyers" as any,
          limit: input.limit,
          sort: "-createdAt",
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;

        // Remove undefined values from data to avoid issues
        const cleanData: Record<string, any> = {};
        if (input.data && typeof input.data === "object") {
          for (const [key, value] of Object.entries(input.data)) {
            if (value !== undefined) {
              cleanData[key] = value;
            }
          }
        }

        const buyer = await payload.update({
          collection: "buyers" as any,
          id: input.buyerId,
          data: cleanData as any,
        });

        return {
          buyer,
          success: true,
          message: "Buyer updated successfully",
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
          collection: "buyers" as any,
          id: input.buyerId,
          depth: 1,
        });

        if (!buyer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Buyer not found",
          });
        }

        const userId =
          typeof buyer.user === "object" ? buyer.user.id : buyer.user;
        const deletionSummary = {
          buyer: false,
          user: false,
          orders: 0,
        };

        try {
          // 1. Delete all orders where buyer matches
          if (userId) {
            const ordersResult = await payload.find({
              collection: "orders",
              where: {
                buyer: { equals: userId },
              },
              limit: 1000,
            });

            for (const order of ordersResult.docs) {
              await payload.delete({
                collection: "orders",
                id: order.id,
              });
            }
            deletionSummary.orders = ordersResult.totalDocs;
          }

          // 2. Delete buyer profile
          await payload.delete({
            collection: "buyers" as any,
            id: input.buyerId,
          });
          deletionSummary.buyer = true;

          // 3. Check if user has other profiles (supplier/vendor profile)
          if (userId) {
            const vendorProfile = await payload.find({
              collection: "suppliers",
              where: {
                user: { equals: userId },
              },
              limit: 1,
            });

            if (vendorProfile.totalDocs === 0) {
              // No vendor profile, safe to delete user
              await payload.delete({
                collection: "users",
                id: userId,
              });
              deletionSummary.user = true;
            }
            // If vendor profile exists, keep user but remove buyer role
          }
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to delete buyer: ${error.message}`,
          });
        }

        return {
          success: true,
          message: "Buyer and all related data deleted successfully",
          deleted: deletionSummary,
        };
      }),
  }),

  /**
   * Product catalog (admin UI)
   */
  products: createTRPCRouter({
    list: adminProcedure
      .input(
        z.object({
          page: z.number().min(1).optional().default(1),
          limit: z.number().min(1).max(100).optional().default(20),
          search: z.string().optional(),
          supplierId: z.string().optional(),
          sort: z
            .enum([
              "-createdAt",
              "createdAt",
              "title",
              "-title",
              "unitPrice",
              "-unitPrice",
              "moq",
              "-moq",
              "validatedOn",
              "-validatedOn",
            ])
            .optional()
            .default("-createdAt"),
        })
      )
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload;
        const where: Record<string, any> = {};

        if (input.supplierId) {
          where.supplier = { equals: input.supplierId };
        }

        if (input.search?.trim()) {
          const q = input.search.trim();
          where.or = [
            { title: { contains: q } },
            { category: { contains: q } },
          ];
        }

        const result = await payload.find({
          collection: "products",
          where,
          limit: input.limit,
          page: input.page,
          sort: input.sort,
          // Populate supplier + images → media (for list thumbnails)
          depth: 2,
        });

        const totalPages = Math.max(
          1,
          Math.ceil(result.totalDocs / input.limit)
        );

        return {
          docs: result.docs,
          totalDocs: result.totalDocs,
          totalPages,
          page: input.page,
          limit: input.limit,
        };
      }),

    getById: adminProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const product = await ctx.payload.findByID({
          collection: "products",
          id: input.id,
          depth: 2,
        });
        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }
        return product;
      }),

    /**
     * OpenAI Vision: suggest title + description from an uploaded media image.
     * Uses the supplier document's openaiApiKey only (not server env).
     */
    suggestFromImage: adminProcedure
      .input(
        z.object({
          mediaId: z.string().min(1),
          fallbackTitle: z.string().min(1).optional(),
          /** Required: load OPENAI_API_KEY from this supplier record. */
          supplierId: z.string().min(1),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const media = await ctx.payload.findByID({
          collection: "media",
          id: input.mediaId,
          depth: 0,
          overrideAccess: true,
        });
        if (!media) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }

        const { resolveMediaDisplayUrl } = await import("@/lib/media-url");
        const { suggestProductCopyFromImageUrl } = await import(
          "@/lib/openai-product-from-image"
        );

        const imageUrl = resolveMediaDisplayUrl(media as any, {
          allowIdProxy: false,
        });
        if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Media has no public image URL for AI (need Blob CDN URL).",
          });
        }

        const fallback =
          input.fallbackTitle?.trim() ||
          (typeof media.alt === "string" && media.alt.trim()) ||
          "Product";

        let supplierKey: string | null = null;
        try {
          const supplier = await ctx.payload.findByID({
            collection: "suppliers",
            id: input.supplierId,
            depth: 0,
            overrideAccess: true,
            showHiddenFields: true,
            user: ctx.user,
          });
          const raw = supplier?.openaiApiKey;
          supplierKey =
            typeof raw === "string" && raw.trim() ? raw.trim() : null;
        } catch {
          supplierKey = null;
        }

        if (!supplierKey) {
          return {
            title: fallback,
            description: "",
            unitPrice: null as number | null,
            usedAi: false as const,
            skipReason:
              "No OPENAI_API_KEY on this supplier — set it in Edit Supplier",
            keySource: "none" as const,
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
            keySource: "supplier" as const,
          };
        } catch (e: unknown) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              e instanceof Error
                ? e.message
                : "Failed to analyze image with AI",
          });
        }
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          title: z.string().min(1).optional(),
          category: z.string().optional(),
          unitPrice: z.number().min(0).nullable().optional(),
          moq: z.number().int().min(0).nullable().optional(),
          actualSupplierUrl: z
            .string()
            .max(2048)
            .optional()
            .refine(
              (v) => !v || v.trim() === "" || /^https?:\/\/.+/i.test(v.trim()),
              {
                message:
                  "Actual supplier URL must be empty or start with http:// or https://",
              }
            ),
          validatedOn: z
            .string()
            .nullable()
            .optional()
            .refine(
              (v) =>
                v === undefined ||
                v === null ||
                v === "" ||
                !Number.isNaN(Date.parse(v)),
              {
                message:
                  "Validated on must be a valid ISO date, empty, or null",
              }
            ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const existing = await payload.findByID({
          collection: "products",
          id: input.id,
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }

        const data: Record<string, unknown> = {};

        if (input.title !== undefined) {
          data.title = input.title;
        }
        if (input.category !== undefined) {
          const c = input.category.trim();
          data.category = c === "" ? null : c;
        }
        if (input.unitPrice !== undefined) {
          data.unitPrice = input.unitPrice;
        }
        if (input.moq !== undefined) {
          data.moq = input.moq;
        }
        if (input.actualSupplierUrl !== undefined) {
          const u = input.actualSupplierUrl.trim();
          data.actualSupplierUrl = u === "" ? null : u;
        }
        if (input.validatedOn !== undefined) {
          if (input.validatedOn === null || input.validatedOn === "") {
            data.validatedOn = null;
          } else {
            data.validatedOn = input.validatedOn;
          }
        }

        if (Object.keys(data).length === 0) {
          return { product: existing, success: true as const };
        }

        const product = await payload.update({
          collection: "products",
          id: input.id,
          data: data as any,
        });

        return { product, success: true as const };
      }),

    /**
     * Mass update list fields (spreadsheet / CSV / Save all).
     */
    bulkUpdate: adminProcedure
      .input(
        z.object({
          items: z
            .array(
              z.object({
                id: z.string().min(1),
                title: z.string().min(1).optional(),
                category: z.string().optional(),
                unitPrice: z.number().min(0).nullable().optional(),
                moq: z.number().int().min(0).nullable().optional(),
                actualSupplierUrl: z
                  .string()
                  .max(2048)
                  .optional()
                  .refine(
                    (v) =>
                      !v ||
                      v.trim() === "" ||
                      /^https?:\/\/.+/i.test(v.trim()),
                    {
                      message:
                        "Actual supplier URL must be empty or start with http:// or https://",
                    },
                  ),
                validatedOn: z
                  .string()
                  .nullable()
                  .optional()
                  .refine(
                    (v) =>
                      v === undefined ||
                      v === null ||
                      v === "" ||
                      !Number.isNaN(Date.parse(v)),
                    {
                      message:
                        "Validated on must be a valid ISO date, empty, or null",
                    },
                  ),
              }),
            )
            .min(1)
            .max(200),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;
        const updated: string[] = [];
        const errors: Array<{ id: string; error: string }> = [];

        for (const item of input.items) {
          try {
            const existing = await payload.findByID({
              collection: "products",
              id: item.id,
            });
            if (!existing) {
              errors.push({ id: item.id, error: "Not found" });
              continue;
            }

            const data: Record<string, unknown> = {};
            if (item.title !== undefined) data.title = item.title;
            if (item.category !== undefined) {
              const c = item.category.trim();
              data.category = c === "" ? null : c;
            }
            if (item.unitPrice !== undefined) data.unitPrice = item.unitPrice;
            if (item.moq !== undefined) data.moq = item.moq;
            if (item.actualSupplierUrl !== undefined) {
              const u = item.actualSupplierUrl.trim();
              data.actualSupplierUrl = u === "" ? null : u;
            }
            if (item.validatedOn !== undefined) {
              if (item.validatedOn === null || item.validatedOn === "") {
                data.validatedOn = null;
              } else {
                data.validatedOn = item.validatedOn;
              }
            }

            if (Object.keys(data).length === 0) {
              updated.push(item.id);
              continue;
            }

            await payload.update({
              collection: "products",
              id: item.id,
              data: data as any,
            });
            updated.push(item.id);
          } catch (e: unknown) {
            errors.push({
              id: item.id,
              error: e instanceof Error ? e.message : "Update failed",
            });
          }
        }

        return {
          success: errors.length === 0,
          updatedCount: updated.length,
          updated,
          errors: errors.length ? errors : undefined,
        };
      }),

    updateFull: adminProcedure
      .input(adminProductUpdateFullInputSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...rest } = input;
        const existing = await ctx.payload.findByID({
          collection: "products",
          id,
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }
        const data = toPayloadProductData(rest);
        try {
          const product = await ctx.payload.update({
            collection: "products",
            id,
            data: data as any,
          });
          return { product, success: true as const };
        } catch (error: unknown) {
          if (error instanceof ValidationError) {
            const fieldErrors =
              error.data?.errors?.map((e) => `${e.path}: ${e.message}`).join("; ") ??
              error.message;
            throw new TRPCError({
              code: "BAD_REQUEST",
              cause: error,
              message: fieldErrors,
            });
          }
          throw error;
        }
      }),

    create: adminProcedure
      .input(adminProductCreateInputSchema)
      .mutation(async ({ ctx, input }) => {
        const data = toPayloadProductData(input);
        const product = await ctx.payload.create({
          collection: "products",
          data: data as any,
        });
        return { product, success: true as const };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const existing = await payload.findByID({
          collection: "products",
          id: input.id,
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }

        await payload.delete({
          collection: "products",
          id: input.id,
        });

        return { success: true as const };
      }),

    bulkDelete: adminProcedure
      .input(
        z.object({
          ids: z.array(z.string().min(1)).min(1).max(100),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const payload = ctx.payload;
        const deleted: string[] = [];
        const errors: Array<{ id: string; error: string }> = [];

        for (const id of [...new Set(input.ids)]) {
          try {
            await payload.delete({
              collection: "products",
              id,
            });
            deleted.push(id);
          } catch (e: unknown) {
            errors.push({
              id,
              error: e instanceof Error ? e.message : "Delete failed",
            });
          }
        }

        return {
          success: errors.length === 0,
          deletedCount: deleted.length,
          deleted,
          errors: errors.length ? errors : undefined,
        };
      }),
  }),

  /**
   * Order management
   */
  orders: createTRPCRouter({
    list: adminProcedure
      .input(
        z.object({
          page: z.number().min(1).optional().default(1),
          limit: z.number().min(1).max(100).optional().default(20),
          search: z.string().optional(),
          status: z.string().optional(),
          sort: z
            .enum(['-createdAt', 'createdAt', 'totalAmount', '-totalAmount'])
            .optional()
            .default('-createdAt'),
        }),
      )
      .query(async ({ ctx, input }) => {
        const where: Record<string, any> = {};

        if (input.status) {
          where.status = { equals: input.status };
        }

        if (input.search?.trim()) {
          const q = input.search.trim();
          where.or = [
            { poNumber: { contains: q } },
            { phoneNumber: { contains: q } },
          ];
        }

        const result = await ctx.payload.find({
          collection: 'orders',
          where,
          limit: input.limit,
          page: input.page,
          sort: input.sort,
          depth: 2,
        });

        const totalPages = Math.max(
          1,
          Math.ceil(result.totalDocs / input.limit),
        );

        return {
          docs: result.docs,
          totalDocs: result.totalDocs,
          totalPages,
          page: input.page,
          limit: input.limit,
        };
      }),

    getById: adminProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        try {
          const order = await ctx.payload.findByID({
            collection: 'orders',
            id: input.id,
            depth: 2,
          });
          return order;
        } catch {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Order not found',
          });
        }
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          status: z
            .enum([
              'pending',
              'confirmed',
              'in_production',
              'quality_check',
              'shipped',
              'delivered',
              'completed',
              'cancelled',
              'disputed',
            ])
            .optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        if (Object.keys(data).length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No fields to update',
          });
        }

        try {
          const order = await ctx.payload.update({
            collection: 'orders',
            id,
            data,
          });
          return { order, success: true as const };
        } catch {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Order not found',
          });
        }
      }),

    recent: adminProcedure
      .input(
        z.object({ limit: z.number().min(1).max(50).optional().default(10) })
      )
      .query(async ({ ctx, input }) => {
        const payload = ctx.payload;

        const result = await payload.find({
          collection: "orders",
          limit: input.limit,
          sort: "-createdAt",
          depth: 2,
        });

        return result.docs;
      }),
  }),

  /**
   * User account management
   */
  users: createTRPCRouter({
    list: adminProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).optional().default(20),
          page: z.number().min(1).optional().default(1),
          role: z
            .enum(["all", "user", "vendor", "buyer", "admin", "bdo"])
            .optional()
            .default("all"),
          search: z.string().optional(),
          sort: z
            .enum([
              "createdAt",
              "-createdAt",
              "email",
              "-email",
              "name",
              "-name",
              "role",
              "-role",
            ])
            .optional()
            .default("-createdAt"),
        }),
      )
      .query(async ({ ctx, input }) => {
        const where: Record<string, unknown> = {};

        if (input.role !== "all") {
          where.role = { equals: input.role };
        }

        if (input.search?.trim()) {
          const q = input.search.trim();
          where.or = [{ email: { contains: q } }, { name: { contains: q } }];
        }

        const result = await ctx.payload.find({
          collection: "users",
          where: where as any,
          limit: input.limit,
          page: input.page,
          sort: input.sort,
          depth: 0,
        });

        const usersWithProfiles = await Promise.all(
          result.docs.map(async (user: any) => {
            const [suppliers, buyers] = await Promise.all([
              ctx.payload.find({
                collection: "suppliers",
                where: { user: { equals: user.id } },
                limit: 1,
              }),
              ctx.payload.find({
                collection: "buyers",
                where: { user: { equals: user.id } },
                limit: 1,
              }),
            ]);

            return {
              ...toAdminUserView(user),
              hasSupplierProfile: suppliers.totalDocs > 0,
              hasBuyerProfile: buyers.totalDocs > 0,
            };
          }),
        );

        return {
          users: usersWithProfiles,
          total: result.totalDocs,
          page: input.page,
          totalPages: Math.ceil(result.totalDocs / input.limit),
          limit: input.limit,
        };
      }),

    /** Admin + BDO users that can be assigned as a supplier's BDO. */
    listBdoCandidates: adminProcedure.query(async ({ ctx }) => {
      const result = await ctx.payload.find({
        collection: "users",
        where: {
          role: { in: ["admin", "bdo"] },
        },
        limit: 200,
        sort: "name",
        depth: 0,
      });

      return result.docs.map((user) => {
        const view = toAdminUserView(user as Parameters<typeof toAdminUserView>[0]);
        return {
          id: view.id,
          name: view.name,
          email: view.email,
          role: view.role,
        };
      });
    }),

    getOne: adminProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ ctx, input }) => {
        try {
          const user = await ctx.payload.findByID({
            collection: "users",
            id: input.userId,
            depth: 0,
          });

          const [suppliers, buyers] = await Promise.all([
            ctx.payload.find({
              collection: "suppliers",
              where: { user: { equals: input.userId } },
              limit: 1,
              depth: 0,
            }),
            ctx.payload.find({
              collection: "buyers",
              where: { user: { equals: input.userId } },
              limit: 1,
              depth: 0,
            }),
          ]);

          return {
            ...toAdminUserView(user as Parameters<typeof toAdminUserView>[0]),
            supplierProfile: suppliers.docs[0]
              ? { id: suppliers.docs[0].id, companyName: (suppliers.docs[0] as { companyName?: string }).companyName }
              : null,
            buyerProfile: buyers.docs[0]
              ? { id: buyers.docs[0].id, companyName: (buyers.docs[0] as { companyName?: string }).companyName }
              : null,
          };
        } catch {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }
      }),

    create: adminProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(6),
          name: z.string().optional(),
          role: userRoleSchema.optional().default("user"),
          oauthProvider: oauthProviderSchema.optional().default("email"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.payload.find({
          collection: "users",
          where: { email: { equals: input.email } },
          limit: 1,
        });

        if (existing.totalDocs > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A user with this email already exists",
          });
        }

        const user = await ctx.payload.create({
          collection: "users",
          data: {
            email: input.email,
            password: input.password,
            name: input.name,
            role: input.role,
            oauthProvider: input.oauthProvider,
          },
          overrideAccess: true,
        });

        return {
          user: toAdminUserView(user as Parameters<typeof toAdminUserView>[0]),
          success: true as const,
        };
      }),

    update: adminProcedure
      .input(
        z.object({
          userId: z.string(),
          email: z.string().email().optional(),
          name: z.string().nullable().optional(),
          role: userRoleSchema.optional(),
          oauthProvider: oauthProviderSchema.optional(),
          password: z.string().min(6).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { userId, password, ...fields } = input;
        const data: Record<string, unknown> = {};

        if (fields.email !== undefined) data.email = fields.email;
        if (fields.name !== undefined) data.name = fields.name;
        if (fields.role !== undefined) data.role = fields.role;
        if (fields.oauthProvider !== undefined) {
          data.oauthProvider = fields.oauthProvider;
        }
        if (password) data.password = password;

        if (Object.keys(data).length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No fields to update",
          });
        }

        if (
          userId === ctx.user.id &&
          fields.role !== undefined &&
          fields.role !== "admin"
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot remove your own admin role",
          });
        }

        if (fields.role !== undefined && fields.role !== "admin") {
          const current = await ctx.payload.findByID({
            collection: "users",
            id: userId,
          });
          if ((current as { role?: string }).role === "admin") {
            const admins = await ctx.payload.find({
              collection: "users",
              where: { role: { equals: "admin" } },
              limit: 2,
            });
            if (admins.totalDocs <= 1) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Cannot demote the last admin account",
              });
            }
          }
        }

        try {
          const user = await ctx.payload.update({
            collection: "users",
            id: userId,
            data,
            overrideAccess: true,
          });

          return {
            user: toAdminUserView(user as Parameters<typeof toAdminUserView>[0]),
            success: true as const,
          };
        } catch {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }
      }),

    delete: adminProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await assertCanDeleteUser(
          ctx.payload,
          input.userId,
          String(ctx.user.id),
        );

        try {
          await ctx.payload.delete({
            collection: "users",
            id: input.userId,
            overrideAccess: true,
          });

          return {
            success: true as const,
            message: "User deleted successfully",
          };
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error?.message || "Failed to delete user",
          });
        }
      }),
  }),
});
