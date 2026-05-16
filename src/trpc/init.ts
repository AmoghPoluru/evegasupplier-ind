import { initTRPC } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { getPayload } from 'payload';
import config from '@payload-config';
import superjson from 'superjson';
import { headers as getHeaders } from 'next/headers';

export async function createTRPCContext(
  opts?: FetchCreateContextFnOptions,
): Promise<{
  payload: Awaited<ReturnType<typeof getPayload>>;
  headers: Headers;
}> {
  const payload = await getPayload({ config });
  /** Route handler: actual Request headers (cookies). RSC/createCaller: `opts` omitted → Next headers(). */
  const headers =
    opts?.req?.headers ??
    ((await getHeaders()) as unknown as Headers);

  return {
    payload,
    headers,
  };
}

// Avoid exporting the entire t-object; the use of a t variable is common in i18n libraries.
const t = initTRPC.context<typeof createTRPCContext>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure.use(async ({ ctx, next }) => {
  // Use payload from context if available, otherwise create new instance
  const payload = ctx.payload || await getPayload({ config });

  return next({ ctx: { ...ctx, payload } });
});
