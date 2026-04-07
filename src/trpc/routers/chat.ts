import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { baseProcedure, createTRPCRouter } from '../init';

const MAX_BODY = 8000;

function getId(ref: string | { id: string } | null | undefined): string | null {
  if (ref == null) return null;
  const raw = typeof ref === 'object' ? ref.id : ref;
  if (raw == null) return null;
  return String(raw);
}

async function requireUser(ctx: { payload: any; headers: Headers }) {
  const { user } = await ctx.payload.auth({ headers: ctx.headers });
  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be logged in' });
  }
  return user as { id: string; role?: string };
}

async function loadConversation(
  payload: any,
  conversationId: string,
): Promise<{
  id: string;
  ownerUser: string | { id: string };
  bdo: string | { id: string };
  profileKind: string;
}> {
  const conv = await payload.findByID({
    collection: 'bdo-conversations',
    id: conversationId,
    depth: 0,
    overrideAccess: true,
  });
  if (!conv) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
  }
  return conv as any;
}

function assertConversationMember(
  user: { id: string; role?: string },
  conv: { ownerUser: string | { id: string }; bdo: string | { id: string } },
) {
  const ownerId = getId(conv.ownerUser);
  const bdoId = getId(conv.bdo);
  const userId = String(user.id);
  if (user.role === 'admin') return;
  if (ownerId != null && userId === ownerId) return;
  if (bdoId != null && userId === bdoId) return;
  throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a participant in this conversation' });
}

export const chatRouter = createTRPCRouter({
  /** Idempotent get-or-create; use mutation so React Strict Mode / retries do not duplicate via GET semantics. */
  ensureConversation: baseProcedure
    .input(
      z.object({
        profileKind: z.enum(['buyer', 'vendor']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireUser(ctx);

      if (input.profileKind === 'buyer') {
        const buyers = await ctx.payload.find({
          collection: 'buyers',
          where: { user: { equals: user.id } },
          limit: 1,
          depth: 1,
          overrideAccess: true,
        });
        const buyer = buyers.docs[0] as any;
        if (!buyer) {
          return { ok: false as const, reason: 'no_profile' as const };
        }
        const bdoId = getId(buyer.bdo);
        if (!bdoId) {
          return { ok: false as const, reason: 'no_bdo' as const };
        }
        const ownerUserId =
          typeof buyer.user === 'object' && buyer.user ? (buyer.user as { id: string }).id : buyer.user;

        const existing = await ctx.payload.find({
          collection: 'bdo-conversations',
          where: {
            and: [
              { profileKind: { equals: 'buyer' } },
              { buyer: { equals: buyer.id } },
              { bdo: { equals: bdoId } },
            ],
          },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        });

        if (existing.docs[0]) {
          return { ok: true as const, conversation: existing.docs[0], reason: null };
        }

        const created = await ctx.payload.create({
          collection: 'bdo-conversations',
          data: {
            profileKind: 'buyer',
            buyer: buyer.id,
            bdo: bdoId,
            ownerUser: ownerUserId,
            status: 'open',
          },
          overrideAccess: true,
        });

        return { ok: true as const, conversation: created, reason: null };
      }

      const vendors = await ctx.payload.find({
        collection: 'vendors',
        where: { user: { equals: user.id } },
        limit: 1,
        depth: 1,
        overrideAccess: true,
      });
      const vendor = vendors.docs[0] as any;
      if (!vendor) {
        return { ok: false as const, reason: 'no_profile' as const };
      }
      const bdoId = getId(vendor.bdo);
      if (!bdoId) {
        return { ok: false as const, reason: 'no_bdo' as const };
      }
      const ownerUserId =
        typeof vendor.user === 'object' && vendor.user ? (vendor.user as { id: string }).id : vendor.user;

      const existing = await ctx.payload.find({
        collection: 'bdo-conversations',
        where: {
          and: [
            { profileKind: { equals: 'vendor' } },
            { vendor: { equals: vendor.id } },
            { bdo: { equals: bdoId } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });

      if (existing.docs[0]) {
        return { ok: true as const, conversation: existing.docs[0], reason: null };
      }

      const created = await ctx.payload.create({
        collection: 'bdo-conversations',
        data: {
          profileKind: 'vendor',
          vendor: vendor.id,
          bdo: bdoId,
          ownerUser: ownerUserId,
          status: 'open',
        },
        overrideAccess: true,
      });

      return { ok: true as const, conversation: created, reason: null };
    }),

  listMessages: baseProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await requireUser(ctx);
      const conv = await loadConversation(ctx.payload, input.conversationId);
      assertConversationMember(user, conv);

      const messages = await ctx.payload.find({
        collection: 'bdo-chat-messages',
        where: { conversation: { equals: input.conversationId } },
        sort: 'createdAt',
        limit: 200,
        depth: 1,
        overrideAccess: true,
      });

      return { messages: messages.docs };
    }),

  sendMessage: baseProcedure
    .input(
      z.object({
        conversationId: z.string(),
        body: z.string().min(1).max(MAX_BODY),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireUser(ctx);
      const conv = await loadConversation(ctx.payload, input.conversationId);
      assertConversationMember(user, conv);

      const body = input.body.trim();
      if (!body) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Message is empty' });
      }

      const created = await ctx.payload.create({
        collection: 'bdo-chat-messages',
        data: {
          conversation: input.conversationId,
          sender: user.id,
          body,
          kind: 'user',
        },
        overrideAccess: true,
      });

      const msg = await ctx.payload.findByID({
        collection: 'bdo-chat-messages',
        id: created.id,
        depth: 1,
        overrideAccess: true,
      });
      if (!msg) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Message was not persisted',
        });
      }

      await ctx.payload.update({
        collection: 'bdo-conversations',
        id: input.conversationId,
        data: {
          lastMessageAt: new Date().toISOString(),
        },
        overrideAccess: true,
      });

      return { message: msg };
    }),

  listConversationsForBdo: baseProcedure.query(async ({ ctx }) => {
    const user = await requireUser(ctx);
    if (user.role !== 'bdo' && user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'BDO or admin only' });
    }

    const where: { bdo?: { equals: string } } =
      user.role === 'admin' ? {} : { bdo: { equals: user.id } };

    const result = await ctx.payload.find({
      collection: 'bdo-conversations',
      where,
      sort: '-lastMessageAt',
      limit: 100,
      depth: 2,
      overrideAccess: true,
    });

    return { conversations: result.docs };
  }),
});
