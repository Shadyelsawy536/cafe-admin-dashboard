# Cafe Admin Dashboard

React + TypeScript + Vite + Tailwind, talking directly to the same Supabase
project as the Flutter customer app. No separate backend — RLS
(`is_restaurant_staff()`) is what actually protects staff-only data.

**Verified before delivery**: `npx tsc --noEmit` passes with zero errors,
and `npm run build` completes a full production build successfully. This
is real verification — unlike the Flutter app, I have Node/npm here and
could actually compile-check this before handing it over.

## Setup

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Sign in with `eshady001@gmail.com` — that
account now has the Owner role for Cafe (granted directly via SQL, all 9
permission keys).

## What's live in this first slice

- **Login** — real Supabase Auth, same account as the Flutter app
- **Staff gating** — checks an actual `restaurant_users` row exists for
  the signed-in account, not just "are they logged in." An account with no
  staff row sees a clear "No staff access" message instead of a broken
  dashboard.
- **Overview** — today's sales, order count, pending count, average order
  value — computed client-side from today's `orders` rows (no view/RPC
  needed yet at this data volume)
- **Orders** — full list, filterable by status, click a row for a detail
  panel (items, modifiers, totals, delivery/pickup info). Status can be
  advanced through the normal lifecycle (Pending → Confirmed → Preparing →
  Ready → Out for Delivery → Delivered) or rejected. Every status change
  writes directly to `orders.status`; the `order_status_history` trigger
  already built into the database logs it automatically — no new backend
  code needed for that part.

Row color-coding (left border) matches order status — a small nod to
physical kitchen ticket rails, meant to make status scannable at a glance
across a long list.

## Design notes

The dashboard has its own neutral, professional identity — teal accent
(`#1F5F5B`), warm off-white canvas, Space Grotesk for headers, Inter for
body text, IBM Plex Mono for numbers/order IDs (tabular figures matter in
a data-dense operational tool). This is deliberately **not** Cafe's
customer-facing brand (brown/cream) — same reasoning Shopify/Stripe use:
the operator tool and the storefront are different products with
different audiences, even though they share a backend.

## Not built yet (next slices, per the agreed step-by-step plan)

- Menu Management (categories/products/variants/modifier groups CRUD)
- Image upload to Cloudflare R2 (blocked on R2 being enabled in the
  Cloudflare dashboard — one-time manual step)
- Detailed sales analytics breakdown (Product → Variant → Modifier Group →
  Modifier drill-down)
- Staff & Permissions management UI
- Offers & Coupons management
- Customers view
- Payment provider configuration (per-restaurant credentials — writes to
  `restaurant_payment_secrets`, which is write-only by design; the
  dashboard will never be able to read a credential back once saved)
- Notifications
- Settings (restaurant info, delivery config, branding)

## Known limitations in this slice

- No pagination on the Orders list yet — fine at current volume, will
  need it once order count grows
- No optimistic UI on status updates (waits for the round-trip) —
  acceptable for now, could add later if it feels slow in practice
