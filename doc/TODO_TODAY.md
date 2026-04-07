# TODO — today

**Date:** 2026-04-05 (update when you edit this file)

Short-lived checklist for the current day. Move completed items to your main task doc or delete them.

---

## Today

- [x] **BDO dashboard — multi-chat from many users + access gate** *(implemented 2026-04-05)*

  **Product:** A dedicated **BDO (coordinator) dashboard** where a logged-in **BDO user** sees **many conversations at once** — one thread per buyer or vendor they coordinate — and can open any thread to reply. This is the **staff-side** counterpart to buyer/vendor floating chat.

  **Order of work (do not skip):**

  1. **Access gate (first):** Only users who **are** a BDO (and optionally **admin**) may use the BDO dashboard routes. Everyone else gets **redirect** (e.g. sign-in, home, or 403). Define clearly: **`role === 'bdo'`** (match `users` / Payload config) and whether **admin** may impersonate or only use Payload admin.
  2. **Dashboard shell:** After gate passes, render a **BDO layout** (nav, header, optional “logged in as BDO”) and a **default landing route** (e.g. `/bdo` or `/bdo/dashboard`) that orients the user: “Your conversations” / inbox.
  3. **Multi-chat facility:** **Inbox list** — query conversations where **`bdo` = current user** (already aligned with `bdo-conversations` + `listConversationsForBdo`-style API). Sort by **`lastMessageAt`** (or `updatedAt`). Show **counterparty** (buyer or vendor profile / company / email), **last preview**, **unread** later if you add read receipts.
  4. **Thread view:** Selecting a row opens **one conversation** (reuse **`/bdo/inbox/[conversationId]`** pattern or embed panel). **Send** as BDO must use same **`sendMessage`** participant rules (`assertConversationMember` includes BDO id).
  5. **Polish:** Empty state (“no conversations yet”), loading/error states, mobile layout, link from **navbar** only for BDO (already partially there — verify).

  **Relationship to existing code (reference only — verify in repo when implementing):**

  | Area | Purpose |
  |------|--------|
  | **Collections** | `bdo-conversations`, `bdo-chat-messages` — one row per thread; **`bdo`** points at coordinator user. |
  | **tRPC** | `chat.listConversationsForBdo`, `chat.listMessages`, `chat.sendMessage` — BDO must pass membership checks. |
  | **Routes** | `/bdo/inbox`, `/bdo/inbox/[conversationId]` — evolve into full “dashboard” UX (list + detail, maybe split view on desktop). |

  **Out of scope for this TODO block (separate items):** Real-time (Pusher) — still listed elsewhere in this doc; bulk reassignment of BDO; analytics/SLA widgets.

  **Definition of done (MVP):**

  - [x] Non-BDO user cannot open BDO dashboard URLs (gate enforced server-side + layout).
  - [x] BDO user lands on a **dashboard** that lists **all** their assigned conversations (multi-user / multi-thread).
  - [x] BDO can **open** any listed thread and **send** a message that the buyer/vendor sees in their chat UI.

  **Implemented:**

  | Piece | Detail |
  |-------|--------|
  | **Gate** | `src/app/(app)/bdo/layout.tsx` — login redirect; only `role === 'bdo'` or `admin`; others → `/`. |
  | **Routes** | `/bdo` → `/bdo/dashboard`; `/bdo/inbox` → `/bdo/dashboard`; list at **`/bdo/dashboard`**; threads at **`/bdo/inbox/[conversationId]`**. |
  | **UI** | `BdoConversationList` + `bdo/dashboard/page.tsx`; layout header + nav (Conversations, Marketplace). |
  | **Navbar** | “BDO dashboard” → `/bdo/dashboard`. |

- [x] **Remove “Request Quote” UI (product marketplace)** *(done: `ProductCard.tsx`, `products/[productId]/page.tsx`)*

  **Why:** The buttons are non-functional stubs (no `onClick`, no navigation to RFQ flow). Removing them avoids misleading buyers until a real quote flow exists.

  **Scope (this task):** Product listing cards and product detail page only. Full RFQ/Quotes backend removal is a separate, larger change.

  **Technical details:**

  | Location | Action |
  |----------|--------|
  | `src/components/marketplace/ProductCard.tsx` | Remove the outline **Request Quote** `<Button>` (and its `MessageSquare` icon) in the action row. Keep **View Details** and **Add to Cart**. Drop `MessageSquare` from the `lucide-react` import if unused. |
  | `src/app/(app)/products/[productId]/page.tsx` | Remove the outline **Request Quote** `<Button>` next to **Add to Cart** in the action block. Remove `MessageSquare` from imports if no longer used elsewhere in the file. |
  | Layout | After removal, adjust flex/grid if needed so **View Details** + **Add to Cart** still align (e.g. two buttons on product page, two on card). |

  **Verification:**

  - Home marketplace (`/`) and any view using `ProductCard`: no “Request Quote” button.
  - Product detail (`/products/[productId]`): no “Request Quote” button.
  - `pnpm exec tsc --noEmit` (or `npx tsc --noEmit`) passes.

  **Optional follow-up (not part of this checkbox):** If the product should eventually create an RFQ, design flow: buyer auth → `/buyer/rfqs/new` with `productId` query → wire `trpc.buyers.rfqs.*` and only then re-add a single CTA.

  **Related (do not remove in this small task unless explicitly decided):** `RFQs` Payload collection, `src/app/(app)/buyer/rfqs/**`, `src/app/(app)/vendor/rfqs/**`, tRPC routers under `buyers.rfqs` / `vendors.rfqs` — still used by dashboards and RFQ pages.

- [ ] **`/buyer/pending` UX (optional polish)**

  **Implemented (2026):** Checkout no longer uses `requireBuyer()`. `src/app/(app)/checkout/page.tsx` only requires a logged-in session (`payload.auth`); otherwise redirects to `/login`. `checkout.createOrder` no longer requires a row in the `buyers` collection—only an authenticated user (order `buyer` field remains the user id).

  **Optional next steps for pending page:** clearer copy, links to `/` and `/profile`, banner for `?registered=true`, etc. — see `src/app/(app)/buyer/pending/page.tsx`.

- [x] **Checkout / Place order: `isArchived` query error**

  **Symptom:** On `/checkout`, placing an order fails with Payload / Mongo error like **“The following path cannot be queried: isArchived”**.

  **Cause:** `src/trpc/routers/checkout.ts` (`getProducts` and `createOrder`) adds `where: { isArchived: { not_equals: true } }` on the **`products`** collection. The **`Products`** schema in `src/collections/Products.ts` does **not** define `isArchived` (vendor UI may cast `(product as any).isArchived`, but the field is not in the collection config), so Payload cannot query that path.

  **Fix applied:** Remove the `isArchived` clause from checkout product `find` queries; rely on `id: { in: [...] }` only. **Optional later:** add `isArchived` (checkbox, default `false`) to `Products` in Payload, run `npm run generate:types`, then restore filtering if you need soft-delete for catalog items.

  **Also review:** `src/trpc/routers/products.ts` uses `where.isArchived` — confirm those code paths match the schema or add the field for consistency.

- [x] **After checkout → home + multi-vendor carts (manual orders)**

  **Product:** Users should land on **`/`** after placing an order. A cart may contain items from **several suppliers**; because fulfillment is **manual**, create **one order per supplier** instead of blocking checkout.

  **Implemented:**

  | Area | Detail |
  |------|--------|
  | UI | `src/modules/checkout/ui/views/checkout-view.tsx` — `createOrder` **onSuccess**: `clearCart()`, `router.push('/')`, toast mentions multiple orders when `orderIds.length > 1`. |
  | API | `src/trpc/routers/checkout.ts` — `createOrder` groups `cartItems` by product’s `supplier`, creates **one `orders` document per supplier**, returns `{ orderIds: string[], orderId: first }` for compatibility. |
  | Totals | Shipping/tax computed **per order** per supplier group (same placeholder rules as before). |

  **Follow-ups (optional):** Link from toast to `/buyer/orders` if `requireBuyer` path applies; persist real shipping address instead of placeholders in `handlePlaceOrder`.

- [x] **Vendor record: store linked user details + dashboard reads from vendor** *(implemented)*

  **Product:** Account identity for the supplier portal should live on the **vendor** document (in addition to the existing `user` relationship), so dashboards and admin can show **name / email / sign-in context** without always joining `users` in the UI. Password changes remain on the **User** account (Payload auth), not duplicated on the vendor row.

  **Implemented:**

  | Area | Detail |
  |------|--------|
  | **Schema** | `src/collections/Vendors.ts` — fields **`accountName`**, **`accountEmail`**, **`oauthProvider`** (mirrors `users`). Admin default column **`accountEmail`**. |
  | **Sync** | `src/lib/sync-vendor-account-mirror.ts` — `getVendorMirrorFromUser`, `syncAllVendorProfilesForUser`, `backfillVendorAccountMirrors`. **Vendors `beforeChange`**: merge mirrors from linked user on every save. **Users `afterChange`**: push mirrors to all vendors for that user when the user doc changes. **`seedAll`**: calls **`backfillVendorAccountMirrors`** after seeding. |
  | **Dashboard** | `src/app/(app)/vendor/dashboard/page.tsx` — **Account on file** card reads `accountName`, `accountEmail`, `oauthProvider` from the vendor doc. |
  | **Types** | Run `npm run generate:types` after schema changes. |

- [ ] **Assign a BDO (Business Development Officer) to each Vendor and Buyer**

  **Product:** A **BDO** is the internal staff member who **coordinates first** with that supplier or buyer (onboarding, check-ins, escalations). Each **vendor** and **buyer** record should be able to reference **who their BDO is** so admin dashboards, notifications, and filters can use it.

  **Data model options (pick one and document):**

  | Approach | Pros | Cons |
  |----------|------|------|
  | **A. `relationship` → `users`** | Reuse existing accounts; restrict BDO to users with `role: 'admin'` or a new role `bdo` / `staff`. | Need role checks and maybe a filtered relationship or validation hook. |
  | **B. `relationship` → new `staff` or `employees` collection** | Clean separation if BDOs are not login users yet. | Extra collection + CRUD. |
  | **C. Snapshot fields only** (`bdoName`, `bdoEmail`) | Simple, no join. | Drift if BDO changes job; duplicate data. |

  **Recommended starting point:** **(A)** — `bdo` (or `assignedBdo`) as **`relationship` → `users`**, `filterOptions` or `beforeValidate` so only allowed roles can be selected; optional **`bdoAssignedAt`** (`date`) for SLA reporting.

  **Where to add fields:**

  | Collection | File | Notes |
  |------------|------|--------|
  | **Vendors** | `src/collections/Vendors.ts` | Same pattern as `user` (owner); BDO is **platform staff**, not the supplier’s login. |
  | **Buyers** | `src/collections/Buyers.ts` | Mirror the same field names for consistency (`bdo` / `assignedBdo`). |

  **Technical follow-ups:**

  - **Access:** Vendors/buyers may **read** their BDO’s display name (and maybe work email) only; full **admin** can assign or reassign. Implement via `access` on the field’s `read` or hide BDO from public vendor/buyer read if needed (`read: ({ req }) => …`).
  - **Admin UI:** Payload admin: show BDO on vendor/buyer edit; optional list column + filter “assigned BDO”.
  - **App UI:** Vendor dashboard / buyer dashboard — small **“Your coordinator”** card (name + email) if `depth` populated; hide if unassigned.
  - **tRPC / admin:** `admin` router mutations to **assign** or **clear** BDO in bulk; optional filters on `list` endpoints.
  - **Notifications (later):** Email BDO when new vendor/buyer registers or when status → `approved`.
  - **Types:** `npm run generate:types` after schema changes. **Seed:** optional seed `users` with role `BDO` and assign sample vendors/buyers.

  **Out of scope (unless product asks):** Multiple BDOs per account (use array + `hasMany` or a join table `assignments`).

  **Manual checklist (if not already implemented in code):**

  - [ ] Open Payload admin → **Users**: confirm **`bdo`** role exists; create or pick the BDO user (e.g. `subbu.poluru@gmail.com`).
  - [ ] **Vendors** / **Buyers**: set **`bdo`** + **`bdoAssignedAt`** on each record that needs a coordinator (or run `npm run db:seed:bdo` if that script matches your policy).
  - [ ] Log in as buyer and vendor on `/buyer/dashboard` and `/vendor/dashboard` — confirm **Your coordinator** card shows BDO name/email when `depth: 1` is used.

- [ ] **Buyer + supplier dashboards: chat with assigned BDO (real-time, scalable, BDO as agent)**

  **Product:** Chat from buyer/vendor dashboards to the **assigned BDO** (`buyers.bdo` / `vendors.bdo`). Target: **real-time** delivery (not polling as primary), **horizontally scalable** (many Next.js instances + many concurrent chats), and **BDO as agent** — meaning the BDO operates as the accountable human agent (inbox, SLAs, possibly a team); optional **AI agent** layer for triage/FAQs in front of the human.

  **Architecture — real-time + scale:**

  | Piece | Why | Options (pick one stack) |
  |-------|-----|---------------------------|
  | **Source of truth** | Durable history, search, compliance | MongoDB via Payload (`conversations` + `chatMessages` or extended `Messages`). |
  | **Real-time fan-out** | Multiple app servers can’t share in-process sockets | **Managed:** Pusher Channels, Ably, Supabase Realtime. **Self-hosted:** Redis **Pub/Sub** + Socket.io with **Redis adapter** (or similar) behind a load balancer with **sticky sessions** only if you must; prefer pub/sub so instances stay stateless. |
  | **Write path** | Don’t lose messages if push fails | `sendMessage` mutation: **1)** `insert` to DB **2)** **then** publish event `{ threadId, message }` to channel `thread:{id}` (or user channels for BDO + counterparty). Client subscribes; on reconnect, **hydrate from DB** (tRPC `listMessages`). |
  | **Channels / ACL** | BDO and buyer/vendor must not subscribe to others’ threads | Subscribe with **signed token** or **private channel** auth (Pusher/Ably authorize endpoint) that checks `req.user` is a participant; thread id never guessable (opaque ids). |
  | **Scale-out** | More traffic = more API replicas | App servers **stateless**; all realtime via broker; DB indexed on `threadId` + `createdAt`. |

  **BDO as agent (human + optional AI):**

  | Topic | Detail |
  |-------|--------|
  | **Human agent** | BDO user(s) with role `bdo` use **`/bdo/inbox`**; threads filtered by `bdo === me`. Multiple BDOs = natural sharding by `vendors.bdo` / `buyers.bdo`. |
  | **Queue / assignment** | If you add **round-robin** or **load-based** assignment of BDOs, that’s product logic on **create buyer/vendor** or **escalation** — not required for chat v1 if assignment is already on the profile. |
  | **AI as sub-agent (optional)** | Server-side tool: new user message → optional **LLM** for suggested reply or instant FAQ → human BDO still sees full thread; log AI turns with `sender: 'system'` or dedicated flag. Keep API keys **server-only**. |

  **Context (reference):**

  | Topic | Detail |
  |-------|--------|
  | **Thread identity** | One thread per **(buyer xor vendor profile) + BDO user**; opaque `threadId` in DB and in pub/sub channel names. |
  | **No BDO** | UI: “No coordinator assigned” + support link — do not subscribe to a channel. |
  | **Existing `messages`** | `src/collections/Messages.ts` is tied to **`inquiries`**. Prefer **new** collections below so inquiry chat stays unchanged. |

  **New Payload collections (create in code — do not overload `messages`):**

  **1. `bdo-conversations`** (slug: `bdo-conversations` — adjust if you prefer `conversationThreads`)

  | Field | Type | Required | Notes |
  |-------|------|----------|--------|
  | `profileKind` | `select`: `buyer` \| `vendor` | yes | Which side opened the relationship. |
  | `buyer` | `relationship` → `buyers` | conditional | Set when `profileKind === buyer`. `admin.condition` to show only relevant row. |
  | `vendor` | `relationship` → `vendors` | conditional | Set when `profileKind === vendor`. |
  | `bdo` | `relationship` → `users` | yes | Assigned BDO; `filterOptions`: `role` in `['admin','bdo']` (match your Users config). |
  | `ownerUser` | `relationship` → `users` | yes | The **buyer or vendor owner** login (`buyers.user` / `vendors.user`) — speeds up access queries without always joining profile. |
  | `lastMessageAt` | `date` | no | Update on each new message for inbox sorting. |
  | `status` | `select`: `open` \| `archived` | yes | Default `open`. |

  **Uniqueness:** Enforce **one document per** `(buyer + bdo)` or `(vendor + bdo)` via `beforeValidate` / `beforeChange` hook (query existing) or partial unique index in Mongo if you add raw index migration.

  **2. `bdo-chat-messages`** (slug: `bdo-chat-messages`)

  | Field | Type | Required | Notes |
  |-------|------|----------|--------|
  | `conversation` | `relationship` → `bdo-conversations` | yes | Index-friendly; list messages `where: { conversation: { equals: id } }`. |
  | `sender` | `relationship` → `users` | yes | Who sent (buyer owner, vendor owner, or BDO). |
  | `body` | `textarea` | yes | Plain text v1; rich text later if needed. |
  | `kind` | `select`: `user` \| `system` \| `ai` | optional | Default `user`; `system` for joins/welcome; `ai` if you add triage bot. |
  | `attachments` | `upload` → `media`, `hasMany` | optional | Same pattern as existing `Messages`. |
  | `readAt` | `date` | optional | Per-message read; or use separate read receipts later. |

  **Access (outline — refine in code):**

  - **`bdo-conversations` `read`:** `admin` **or** `ownerUser` = `req.user.id` **or** `bdo` = `req.user.id`.
  - **`bdo-conversations` `create`:** authenticated; restrict in hook to profiles where session user owns buyer/vendor and `bdo` matches profile’s assigned BDO.
  - **`bdo-chat-messages` `read` / `create`:** same participant logic via parent `conversation` lookup.

  **Wire-up checklist:**

  - [ ] Add `src/collections/BdoConversations.ts` and `src/collections/BdoChatMessages.ts` (or your names).
  - [ ] Export both in `src/payload.config.ts` (or wherever collections are registered).
  - [ ] `npm run generate:types`.
  - [ ] Add Mongo indexes if needed: `bdo-chat-messages` on `conversation` + `createdAt` (Payload `indexes` or migration script).

  **Manual task list — do in order:**

  1. **Decisions (document in ticket):**
     - [ ] Thread model: one thread per buyer-profile+BDO and per vendor-profile+BDO.
     - [ ] Real-time vendor: **Pusher** vs **Ably** vs **Supabase Realtime** vs **Redis + Socket.io** (self-hosted). Add API keys to `.env` (server + client-safe key separation).
     - [ ] BDO agent scope: **human only** v1 vs **human + AI triage** (later).

  2. **Infra & env:**
     - [ ] Create account / provision Redis or managed realtime; document channel naming: e.g. `private-thread-{uuid}`.
     - [ ] Implement **authorize** route (Next Route Handler or tRPC) that validates user ∈ thread participants before subscription.
     - [ ] After `sendMessage` succeeds in DB, **publish** to realtime (shared small helper `publishThreadMessage(threadId, payload)`).

  3. **Schema (Payload):** follow **“New Payload collections”** tables above (`bdo-conversations`, `bdo-chat-messages`); implement `access` + uniqueness hook.

  4. **tRPC** (`chat` router):
     - [ ] `getOrCreateConversation`: resolve buyer/vendor from session → match `buyers.bdo` / `vendors.bdo` → find-or-create `bdo-conversations` row.
     - [ ] `listMessages`: input `conversationId` — verify participant; query `bdo-chat-messages` sorted by `createdAt`.
     - [ ] `sendMessage`: insert `bdo-chat-messages`, bump `bdo-conversations.lastMessageAt`, then **publish** realtime event.
     - [ ] `markRead`: optional.
     - [ ] Register router; rate-limit `sendMessage`.

  5. **Client — subscribe:**
     - [ ] `BdoChatPanel`: on open, **subscribe** to private channel for `threadId`; on event append message; on mount **fetch** history via `listMessages` (covers reconnect).
     - [ ] Unsubscribe on unmount; handle token refresh for private channels.

  6. **Buyer / vendor dashboards:** embed panel + floating trigger (same as before).

  7. **BDO inbox:** `/bdo/inbox` — list threads for `req.user.id` as BDO; open thread → same realtime client.

  8. **Load / chaos checks (manual):**
     - [ ] Two tabs same user: send in one, appears in other **without** full page refresh.
     - [ ] BDO and buyer: message latency in normal conditions is sub-second (feel real-time).
     - [ ] Restart one app instance (if multiple): chat still works (proves not stuck to one box).
     - [ ] `npx tsc --noEmit`.

  **Optional later:** attachments (`media`), push (APNs/FCM), AI suggested replies, analytics (first response time per BDO agent).

---

## BDO & chat — quick checklist (B2B-style)

> **Purpose:** Same idea as **`B2B_DETAILED_TASKS.md` → “User requirements — todo checklist”**: short bullets you can tick off — env, commands, behavior. Deep specs stay in the **Today** items above.

### Database & seed

- [ ] `.env` has a valid MongoDB URI: `DATABASE_URL=mongodb://…` or `mongodb+srv://…` (optional: `MONGODB_URI` mirrored for seed — see `src/seed/seed.ts`)
- [ ] `npm run db:seed` runs successfully (sample admin, vendors, products, buyer, orders, plus Subbu BDO assignment if that step is enabled in `seedAll`)
- [ ] `npm run db:seed:bdo` runs successfully when you **only** want to ensure `subbu.poluru@gmail.com` as BDO on **all** vendors & buyers (`src/seed/seed-subbu-bdo.ts`)

### BDO coordinator on dashboards

- [ ] Payload **Users** has role **BDO**; **Vendors** / **Buyers** have **`bdo`** + **`bdoAssignedAt`** where needed (Payload admin or seed)
- [ ] Logged-in **buyer** and **supplier**: `/buyer/dashboard` and `/vendor/dashboard` show **Your coordinator** (name/email) when a BDO is assigned — uses `depth: 1` in `getBuyerStatus` / `getVendorStatus`

### BDO chat (after you implement collections + realtime)

- [ ] `.env` includes realtime credentials (e.g. **Pusher:** `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, and client-safe key in Next — **or** Ably / Redis+Socket.io per your choice)
- [ ] Collections **`bdo-conversations`** and **`bdo-chat-messages`** exist, registered in Payload config; `npm run generate:types` passes; tRPC `chat.*` + publish-after-write works
- [ ] **Buyer or vendor** sends a message → **BDO** sees it on `/bdo/inbox` (or equivalent) **without** relying on page refresh alone — realtime path verified

---

## Notes

- Add more bullets above as needed for the day.
