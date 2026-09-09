# Maison Lumière — luxury fragrance e-commerce

Production-quality foundation for a self-manufacturing luxury perfume brand.
Built with the **App Router**, **TypeScript**, **Tailwind CSS**, **React Three
Fiber** and **Framer Motion**.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

## Architecture

### Content abstraction (`src/lib/cms.ts`)

Every page and component reads content **only** through `src/lib/cms.ts` —
never directly from `src/lib/data/*`. The CMS functions are already `async` and
return domain types from `src/lib/types.ts`.

During this demo phase they return the bundled sample content in
`src/lib/data/`. In a later phase each function will query **Supabase** and
return rows in the exact same shape, so:

- the **Admin Dashboard** (`/admin`) can replace all demo content — products,
  collections, notes, prices, sizes, imagery and every piece of homepage copy —
  **without any code change**;
- no page or component needs to be touched when the data source is swapped.

### Route groups

| Group            | Layout                          | Routes |
|------------------|---------------------------------|--------|
| `src/app/(site)` | storefront chrome (nav, footer, cart drawer) | `/`, `/fragrances`, `/fragrances/[slug]`, `/about`, `/contact`, `/cart`, `/checkout`, `/account/*` |
| `src/app/admin`  | admin console shell             | `/admin`, `/admin/products`, `/admin/products/[id]`, `/admin/collections`, `/admin/orders`, `/admin/customers`, `/admin/content`, `/admin/media`, `/admin/settings` |

### Key directories

```
src/
  app/                 App Router routes, loading & error states
  components/
    home/              homepage sections (hero, showcase, notes, story, …)
    layout/            navbar, mobile menu, footer, cart drawer
    product/           cards, grid, filters, gallery, purchase panel
    three/             React Three Fiber flacon + client-only canvas wrapper
    admin/             admin shell, tables, editors
    ui/                reusable primitives (Button, form fields, Skeleton, …)
  lib/
    cms.ts             content access layer (swap point for Supabase)
    data/              demo/sample content (temporary)
    store/cart.ts      client cart (zustand + persist)
    types.ts           domain types
  hooks/
```

### 3D showcase

`components/three/PerfumeBottle.tsx` is a **procedurally modelled** flacon, so
the 3D experience runs with no external asset. Drop a real `.glb` into
`public/models/` and load it with `useGLTF` to replace it — the scene and
homepage section stay the same.

## Database (Phase 2 — Supabase / PostgreSQL)

### Schema

`supabase/migrations/` (run in order by the Supabase CLI):

| File | Contents |
|------|----------|
| `…120000_extensions_and_helpers` | `pgcrypto` / `citext` / `pg_trgm`, enum types, `set_updated_at()` |
| `…120100_core_schema` | 17 tables with PKs, FKs, `CHECK` constraints, timestamps, partial-unique indexes |
| `…120200_indexes` | ~40 secondary indexes (FKs, filters, `gin` for arrays & trigram search) |
| `…120300_triggers` | `updated_at`, new-user → `profiles`, order-number generation, status-history log, coupon counting |
| `…120400_rls` | role helpers (`is_staff()` / `is_admin()`), **RLS enabled on every table** + 33 policies |
| `…120500_views` | `product_catalog` read model (`security_invoker`) with variants/notes/images/model folded into JSON |

Tables: `profiles, categories, products, product_variants, fragrance_notes,
product_notes, product_images, product_3d_models, carts, cart_items,
customizations, orders, order_items, order_status_history, coupons,
coupon_usage, store_settings`.

### RLS model

- **Catalog** — world-readable when `status='active'` / `is_active`; writable only by `staff`/`admin`.
- **`store_settings`, active `coupons`** — world-readable; staff-writable.
- **`profiles` / `carts` / `orders`** — each user sees only their own rows; staff see all.
- The **service-role key bypasses RLS** and is used server-side only (`src/lib/supabase/admin.ts`, seeding, admin mutations).

### Client & server utilities (`src/lib/supabase/`)

| Module | Use |
|--------|-----|
| `env.ts` | env parsing, `isSupabaseConfigured` |
| `client.ts` | browser client (`createBrowserClient`) |
| `server.ts` | request-scoped server client (cookies) — `server-only` |
| `admin.ts` | service-role client — `server-only`, **never imported client-side** |
| `queries.ts` | typed read queries + `checkDatabaseHealth()` |
| `mappers.ts` | DB rows → domain types |
| `mutations.ts` | admin write-back (`saveStoreSetting`, `updateProduct`) |
| `database.types.ts` | hand-authored schema types (regenerate with `npm run db:types`) |

`src/middleware.ts` refreshes the auth session (no-op when unconfigured).

### Fallback behaviour

`src/lib/cms.ts` queries Supabase when `NEXT_PUBLIC_SUPABASE_URL` +
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. Otherwise it reads the **local admin
store** (`.data/admin/*.json`, seeded from `src/lib/data/*`), so catalogue edits
made in the Admin Dashboard show on the storefront even without Supabase. The
bundled `src/lib/data/*` content is only the initial seed.

### Setup

```bash
cp .env.example .env.local          # fill in Supabase URL + keys
supabase start                      # local stack (Docker)
supabase db reset                   # applies migrations + supabase/seed.sql
npm run db:validate                 # migrations + seed + RLS against in-process PG (no Docker)
npm run db:test                     # connection / queries / retrieval / RLS / error handling
npm run db:seed                     # re-seed a hosted project from src/lib/data/*
```

## Admin Dashboard (Phase 3)

`/admin` is a full catalogue management console.

### Auth & route security

- `(dashboard)/layout.tsx` calls `requireStaff()` (`src/lib/auth.ts`) on every
  render — resolves the Supabase user, looks up `profiles.role`, and
  `redirect()`s anyone who isn't `staff`/`admin`.
- **Every Server Action** in `src/app/admin/actions.ts` independently calls
  `requireStaff()` — access is never granted by the client merely rendering a
  page.
- `src/middleware.ts` bounces unauthenticated `/admin/*` requests to
  `/admin/login` as a first line of defence.
- `/admin/login` — Supabase email/password sign-in (`useFormState`).
- Local dev without Supabase: set `ADMIN_DEV_BYPASS=true` (ignored in
  production and whenever Supabase is configured).

### Repository abstraction

`src/lib/admin/repo.ts` defines `AdminRepo`; `getAdminRepo()` picks:

| Backend | When | Storage |
|---|---|---|
| `SupabaseAdminRepo` | Supabase + service-role key set | Postgres tables |
| `LocalAdminRepo` | otherwise | `.data/admin/*.json`, seeded from `src/lib/data/*` |

Both satisfy the same interface, so the dashboard and its tests work offline and
against Supabase identically. Shared list logic lives in `src/lib/admin/list.ts`.

### What the admin can do (no code edits)

- **Products** — create, edit, delete, publish/unpublish, feature/unfeature.
  Fields: name, slug, short + full description, fragrance story, ingredients,
  category, families, concentration, wear, perfumer, longevity, sillage, base
  SKU, release year, accent colour.
- **Variants** — add/edit/remove bottle sizes with per-variant price, **sale
  price**, stock and SKU; choose the default. Sizes are never hardcoded.
- **Note pyramid** — assign top/heart/base notes from the shared library;
  quick-create a missing note inline.
- **Media** — upload product **images** (JPEG/PNG/WebP/AVIF) and **3D models**
  (`.glb`/`.gltf`) to **Supabase Storage** (bucket `product-media`, public read,
  staff-only write — `supabase/migrations/…_storage.sql`). Set primary image,
  reorder, delete; set active model, delete. Offline, uploads land in
  `public/uploads/`. The storefront 3D showcase loads an uploaded GLB when
  present and falls back to the procedural flacon.
- **Categories** — full CRUD (delete blocked while products are assigned).
- **Fragrance notes** — full CRUD with search + family filter.
- **Search & filters** on the products table: text search, category, family,
  status, featured, sort, pagination (URL-driven).

### Tests

```bash
npm run admin:test     # 43 checks — full CRUD for products, variants, categories,
                       # notes, pyramids, images, models + list search/filter/sort/paginate
                       # + storefront reflection, against LocalAdminRepo
npm run db:validate    # migrations (incl. Phase 3 fields + storage bucket/policies) on PGlite
```

## Cinematic 3D experience (Phase 4)

The product page opens with a scroll-choreographed 3D presentation
(`src/components/three/`), built on React Three Fiber + drei + Framer Motion.

### Behaviour

- **Bundled demo model** — `public/models/demo-flacon.gltf` (a self-contained
  glTF with a "Bottle" + animatable "Cap" node), regenerate with
  `npm run model:demo`. Six of eight seeded products use it; two are left
  model-less to show the fallback. **The client replaces it per product from
  Admin → product → Media** (`product_3d_models.model_url`).
- **Scroll choreography** (`rig-math.ts`, pure & unit-tested): bottle rotates
  2.4 turns, camera dollies `z 7 → 4` with a gentle arc and rise, the bottle
  zooms, the **cap lifts & tilts open** between scroll 34–60%, and a **refined
  perfume-spray mist** emits past 82%. Captions cross-fade; the name reveals at
  the end.
- **After the experience** — story, fragrance family, top/heart/base notes,
  ingredients, longevity, sillage, recommended occasions (derived when not
  curated — `src/lib/fragrance.ts`), bottle sizes, price and Add to Cart
  (`ProductFacts.tsx`).

### It never breaks the page

`PerfumeExperience.tsx` decides via `useDeviceCapabilities()`
(`decideExperienceMode`, unit-tested):

| Condition | Result |
|---|---|
| SSR / first paint, probe not ready | image hero (`ImageFallbackHero`) |
| no WebGL, or `navigator.connection.saveData` | image hero |
| `prefers-reduced-motion` | **static** user-orbitable model, no choreography |
| otherwise | full cinematic (lighter on mobile) |
| GLB fails to load | procedural flacon (per-model error boundary) |
| WebGL context lost / chunk load error | image hero |

Plus: the whole 3D bundle is **lazy-loaded** (`next/dynamic`, `ssr:false`) with
a branded loader, an in-canvas asset-progress loader, and a scene error
boundary. Mobile lowers `dpr`, drops shadows/antialias, cuts spray particles
(200 → 60) and shortens the scroll section.

```bash
npm run experience:test   # 30 checks — demo asset integrity, mode-decision
                          # fallbacks, and the scroll choreography maths
```

> Browser render (desktop + mobile viewports) was not exercised here — the
> Chrome automation bridge wasn't available in this environment. Verified
> instead: production build & SSG of the product page (image fallback in the
> HTML), lazy chunk code-split, `experience:test`, and dev-server runtime with
> no console/build errors.

## Custom perfume / bottle (Phase 5)

Where a product enables it (Admin → product → **Customisation**), the storefront
shows a **“Make it yours”** panel: engrave a name, upload an image (JPEG/PNG/WebP
≤ 5 MB, previewed), pick a bottle option and a packaging option, see the live
configuration and a **server-verified** surcharge.

### Money is never trusted from the browser

- `src/lib/customization/pricing.ts` (`parseCustomizationConfig`,
  `normalizeSelection`, `priceCustomization`) is the single pricing authority.
- The customiser calls `priceCustomizationAction` (server) for the preview — it
  re-derives the delta from the product's stored config.
- At checkout the client sends **selections + quantities only**. `buildOrder`
  (`src/lib/admin/order-calc.ts`, shared by both repo backends) recomputes every
  figure — variant price, customisation surcharge, shipping, total — from the
  catalogue. A price in the request payload is ignored.

### Storage & validation

Images go to the private Supabase Storage bucket **`customer-uploads`**
(migration `…120900`) at unguessable UUID paths, written only by the
service-role key; offline they land in `public/uploads/custom/`. Type and size
are validated on the client (`validateCustomerImage`) **and** again in the
server action / `uploadCustomerImage`.

### Attached to the cart, saved with the order, visible to Admin

- The priced `CustomizationLine` rides on the cart line (`CartItem.customization`,
  keyed by a per-line `lineId` so a personalised line is distinct).
- `createOrderAction` → `orders` + `order_items` + a `customizations` row
  (`kind = 'personalisation'`, enum value added in migration `…120800`) with the
  resolved selection, option labels, price breakdown and image URL/path in
  `payload`.
- **Admin → Orders → order** shows each personalised line: the uploaded image,
  the engraving, the chosen options and the price breakdown — the production
  brief.

```bash
npm run customization:test   # 42 checks — config clamping, selection
                             # normalisation, server-authoritative pricing
                             # (tampered client price ignored), file validation,
                             # and the full enable → order → admin-view flow
```

## Cart & Cash-on-Delivery checkout (Phase 6)

Pakistan-first checkout. The browser holds a wish-list; **every figure that ends
up on an order is recomputed on the server** from the live catalogue.

### Cart

`src/lib/store/cart.ts` (zustand, persisted as `ml-cart`) supports add, remove,
quantity, bottle-size switching (`changeSize`, merging onto an identical line),
and per-line personalisation. `src/lib/store/useCartSync.ts` calls
**`syncCartAction`** on hydration and whenever the lines change: it re-reads each
line against the catalogue and returns the live name, image, price, stock, every
orderable bottle size, and a re-priced personalisation surcharge. That is what
makes stock validation real — a line whose product was delisted, whose size was
withdrawn or whose stock ran out is flagged, over-large quantities are capped,
and the Checkout button is blocked until the shopper resolves it.

Totals: subtotal (qty × [variant price + personalisation delta]), flat
Rs 350 nationwide shipping, free at or above Rs 20,000 (`src/lib/commerce.ts`),
discount from `src/lib/coupons.ts`, grand total.

### Checkout form

`src/components/checkout/CheckoutFlow.tsx` collects full name, mobile, email,
province, city, area, complete address, postal code and order notes, next to a
live order summary (products, quantity, size, customisation, subtotal, shipping
fee, discount, final total) — then **Place Order — Cash on Delivery**.

Geography and contact rules live in `src/lib/pakistan.ts` (7 provinces, curated
city lists with a free-text fallback, `03XXXXXXXXX` / `+92…` mobile
normalisation, 5-digit postal codes). `src/lib/checkout/validation.ts` is pure
and runs twice: in the browser for inline errors, and again on the server, where
the result is authoritative.

### What happens on submit

`createOrderAction` → `AdminRepo.createOrder` → `src/lib/admin/order-calc.ts`:

1. validate customer data · 2. validate the payment method and its payload ·
3. validate products · 4. validate stock (lines sharing a variant are summed) ·
5. recalculate every price, shipping and discount from the catalogue ·
6. mint a unique order number (`ML-#####`, from the `assign_order_number`
   trigger on Supabase and the same shape locally) · 7. create the order ·
8. create the order items · 9. save each personalisation · 10. reserve stock.

Stock reservation is atomic on Supabase (`try_decrement_variant_stock`, with
`restore_variant_stock` + order delete as a rollback if any later step fails);
the local file store applies the same check-then-decrement in one process. A
refused order leaves stock and the order table untouched.

The confirmation screen shows the order number, every product with size,
quantity and personalisation, the totals, the delivery address, the COD payment
method with its instructions, and the current status.

### Adding another Pakistani payment method

`src/lib/payments/registry.ts` is the only file that has to change. Each
`PaymentMethodDef` declares its label, copy, whether it settles online, the
initial order/payment status, and its own `validatePayload`. JazzCash, Easypaisa,
bank transfer and card are already registered with `enabled: false` — the
checkout renders whatever `getEnabledPaymentMethods()` returns, the order
pipeline reads the chosen method's statuses, and the confirmation screen prints
its instructions. Flipping `enabled` (plus a begin/confirm step in the action for
methods that capture online) is the whole integration.

```bash
npm run checkout:test   # 105 checks — geography & contact rules, customer
                        # validation, cart maths, discounts, the payment
                        # registry, the full order pipeline, stock safety,
                        # the storefront server actions, and admin visibility
```

## Customer accounts & order management (Phase 7)

### Authentication

`/account` is a signed-in area — mirroring how `/admin` works, but for
shoppers. `src/lib/customer/auth.ts` resolves the current session and
`requireCustomer()` gates every route under `account/(dashboard)/*`
(`middleware.ts` adds a first-line redirect too, same pattern as the admin
guard). Sign-up, sign-in and sign-out live at `/account/register`,
`/account/login` and a "Sign out" button in the account nav.

- **Supabase configured** — real Supabase Auth. `profiles.role` defaults to
  `customer`; staff/admin are the same users table, just a different role.
- **Local mode** — `src/lib/customer/local-accounts.ts` stores accounts in the
  same JSON-file store as products/orders (`scrypt` password hashing via
  Node's built-in `node:crypto`, no new dependency), and
  `src/lib/customer/session-token.ts` issues a signed, stateless session
  cookie (HMAC-SHA256, 30-day expiry) — no server-side session table needed,
  so "sign out" is just deleting the cookie.

### Customer area

Dashboard (`/account`), Profile (`/account/settings` — name, phone, email,
marketing opt-in, password change), Order history (`/account/orders`), Order
details + tracking (`/account/orders/[id]`), Logout. Placing an order while
signed in attaches `customerId` to it server-side (`createOrderAction` reads
the session — never trusts anything the client sends); checkout stays
guest-friendly either way.

### Order status

Recut to the customer-facing lifecycle — **Pending → Confirmed → Processing →
Shipped → Out for Delivery → Delivered**, with **Cancelled** reachable from any
point before Delivered (`src/lib/admin/records.ts`:
`ORDER_STATUS_FLOW`/`ORDER_STATUS_LABELS`; the Supabase `order_status` enum was
recut the same way in migration `…121100`, remapping the old `paid`/`refunded`
values rather than dropping them silently). Every transition — including the
order being placed — is appended to `order_status_history`
(`src/lib/admin/order-view.ts` assembles it for both repositories identically).

### Admin order management

`/admin/orders`: search (order number, email, tracking number), filter by
status and payment method, sort, paginate (`TableToolbar`/`Pagination`, same
components the products table uses). Opening an order
(`/admin/orders/[id]`) shows the customer (registered account or guest
contact — never invented), products with size/quantity/personalisation, the
full status history, a status-change control with an optional note, a
tracking form (carrier + number), and a cancel action that **restores each
line's reserved stock** and refuses a delivered order. Supabase writes go
through three guarded RPCs (`admin_set_order_status`,
`admin_add_order_tracking`, `admin_cancel_order`) so the history/stock/order
update happens in one transaction; the local backend does the same in one
process.

### Authorization

Enforced twice, independently:

- **Application code** — `getMyOrders`/`getMyOrder`
  (`src/lib/customer/orders.ts`) always filter by the caller's own id; a
  request for someone else's order returns `null`, identical to "doesn't
  exist".
- **Postgres RLS** — `orders_select_own`/`order_status_history_select`
  restrict rows to `user_id = auth.uid()` (staff see everything); a
  `profiles` self-update can edit your own name/phone but a
  `prevent_role_self_escalation` trigger reverts any attempt to also change
  your own `role` unless the caller is already an admin — closing a gap RLS
  alone doesn't: RLS scopes *rows*, not *columns*.

```bash
npm run account:test   # 55 checks — registration, sign-in, session tokens
                        # (sign/verify/tamper/expire), profile & password
                        # updates, order↔account linking, "customers only see
                        # their own orders", the admin pipeline (search,
                        # filter, status history, tracking, cancel+restock),
                        # and the requireStaff() gate refusing an
                        # unauthenticated caller
npm run db:validate     # +19 checks over Phase 2's — the order_status recut,
                        # tracking columns, the three RPCs, and the same
                        # ownership/staff/anon authorization probes run
                        # against real Postgres RLS instead of application code
```

## Store settings & discount system (Phase 8)

Two admin-editable settings blobs (`store_settings.site_content` /
`store_settings.commerce`, unchanged schema — see migration `…120100`), and a
full coupon system with real, enforced usage limits.

### Store settings (Admin → Settings)

Brand name, logo (upload — reuses the product-media uploader under a fixed
`brand` slug), phone, WhatsApp, email, address, shipping fee, free-shipping
threshold, Cash-on-Delivery on/off, and social links — one form
(`StoreSettingsForm`), two writes (`repo.saveSiteContent` /
`repo.saveCommerceSettings`). Before this phase, saving either in **local**
mode silently no-opped (`saveStoreSetting` only wrote to Supabase); both now
persist to the local JSON store the same way products/orders/coupons do, via
new `AdminRepo` methods each backend implements.

**Dynamic across the site, not just the admin form:**
- Server-rendered pages (`(site)/layout.tsx`, `/contact`, `/checkout`) call
  `getSiteContent()`/`getCommerceSettings()` (`src/lib/cms.ts`) fresh —
  Supabase-or-local, exactly like every other piece of content.
- The client cart/checkout preview reads a small `useCommerceSettings` zustand
  store (`src/lib/store/commerce-settings.ts`), hydrated once per request by
  `<CommerceSettingsSync>` — no page needs to prop-drill shipping numbers.
- **COD on/off is enforced, not just hidden.** `payments/registry.ts`'s
  `getEnabledPaymentMethods(settings)` / `getPaymentMethod(id, settings)` take
  the live `codEnabled` flag; `order-calc.ts` re-checks it at the moment an
  order is placed — an admin disabling COD mid-checkout stops the order, not
  just the button.
- A partial save (`saveCommerceSettingsAction({ codEnabled: false })`) never
  blanks the shipping fee or vice versa — `mergeSiteContent`/
  `mergeCommerceSettings` (`src/lib/settings.ts`) merge over the current
  record, shared by both backends' read paths.

### Coupons (Admin → Coupons)

Percentage / fixed-amount / free-shipping, a code, expiration window
(starts-at + expires-at), a total usage limit, a per-customer usage limit,
minimum order value, and active/inactive — full CRUD
(`CouponManager`/`createCouponAction` et al.), backed by a real `coupons` +
`coupon_usage` table pair on both backends (the local store gained both,
seeded with the same three demo coupons `supabase/seed.sql` ships).

`src/lib/coupons.ts`'s `validateCoupon` is the single authority on whether a
code is redeemable right now and what it's worth — `previewCouponAction`
(storefront preview) and `order-calc.ts` (the moment an order is actually
placed) both call it with a **freshly read** coupon record and a **freshly
counted** `coupon_usage` tally, so the two can never disagree and a coupon
that changed state between preview and submit (expired, ran out) is caught
either way:

- **Expired / not-yet-active** — `starts_at`/`expires_at` vs. now.
- **Invalid** — an unknown code, an inactive coupon, or below the minimum
  order value.
- **Overuse** — `max_redemptions` (store-wide) and `per_user_limit`, the
  latter enforced even for a **guest checkout** by email
  (`coupon_usage.email`, migration `…121200` — the column Supabase's schema
  was missing) since a guest has no account id to key on.
- **Manipulated discounts** — `CreateOrderInput` carries a coupon *code*
  only; there is no field for a client-supplied amount anywhere in the
  pipeline. The discount is always `discount_type`/`discount_value` from the
  stored record recomputed against the server-priced subtotal.

An invalid/expired/exhausted coupon at order time is dropped silently rather
than failing the order — the customer still checks out, just without that
discount, exactly like an unrecognised code already worked before this
phase. A successful redemption inserts one `coupon_usage` row and increments
`coupons.redeemed_count` (a trigger does this on Supabase; the local repo does
it in the same transactionless step it already reserves stock in).

```bash
npm run settings:test   # 41 checks — settings merge/persist (incl. the local-
                        # mode gap above), COD as a live setting, coupon CRUD
                        # + validation, full CRUD, expiry/inactive/minimum-
                        # order, store-wide + per-customer (incl. guest)
                        # overuse through the real order pipeline, proof the
                        # discount can't be manipulated, and the staff gate
npm run db:validate     # +3 checks — coupon_usage.email, its indexes, the
                        # seeded demo coupons
```

## Search, filters & UI polish (Phase 9)

- **Search** — `src/lib/catalog-query.ts`'s `applyProductQuery` now matches
  product name, tagline, description, perfumer, fragrance family, **category
  name** and **every note** (top/heart/base). `searchCatalogAction`
  (`src/app/(site)/actions.ts`) runs the same engine for a header quick-search
  overlay (`SearchOverlay` — click the header icon or ⌘K/Ctrl+K, live results,
  keyboard nav, "view all N results" → `/fragrances?q=…`), so a quick-search
  hit and the full listing are never inconsistent with each other. The
  `/fragrances` filter panel also has its own search box, debounced into the
  same `q` param.
- **Filters** — Category and fragrance family (existing) plus new: price
  (preset ranges), bottle size (every ml on offer, computed from the *whole*
  catalogue so options don't disappear as filters narrow the results), and
  availability (in-stock only). Mobile gets a bottom-sheet filter drawer with
  an active-filter-count badge instead of a pushed-down block.
- **Polish** — an out-of-stock overlay / low-stock badge on `ProductCard`;
  `useEscapeKey` (`src/hooks/`) closes the cart drawer, mobile menu and search
  overlay on Escape, not just backdrop-click.

## Production-quality audit (Phase 10)

- **SEO** — `src/app/sitemap.ts` (every product/collection/static URL, from
  the live catalogue) and `src/app/robots.ts` (disallows `/admin`, `/account`,
  `/cart`, `/checkout`); product pages get `alternates.canonical`, full
  Open Graph + Twitter card metadata, and a schema.org `Product` JSON-LD block
  (price, currency, per-size availability, aggregate rating) for rich search
  results; the root layout gained a real (not-404ing) default OG/Twitter image
  and its own canonical; account/login/register are `noindex`.
- **Security** — re-verified rather than rebuilt: the service-role key is
  referenced only from `server-only`-guarded modules, never `NEXT_PUBLIC_`-
  prefixed, never in `next.config.mjs`; `.env.example` ships no real secrets;
  admin auth, RLS, upload validation and server-side price/coupon calculation
  were already covered end-to-end by Phases 2–8's test suites (386 checks,
  all still green).
- **Performance** — 3D was already dynamically imported with `ssr:false` and
  a device-capability/graceful-fallback path (Phase 4); confirmed no
  regressions from the new search/filter code (bundle sizes unchanged for
  every route except `/fragrances`, +~3 kB for the filter panel).
- **Accessibility** — every overlay (cart, mobile menu, search) now closes on
  Escape and carries `role="dialog"`/`aria-modal`; the product-page breadcrumb
  gained `aria-label="Breadcrumb"`; alt text and `:focus-visible` styling were
  already in place across the storefront.

## End-to-end verification & Vercel deployment (Phase 11)

### Test suites (404 automated checks, all green)

```bash
npm run typecheck        # tsc --noEmit
npm run lint
npm run build             # production build

npm run db:validate       # 50  — schema, RLS, seed, authorization, on real Postgres (PGlite)
npm run db:test           #  9  — Supabase client / demo fallback
npm run admin:test        # 43  — product/category/note/media CRUD, search/filter/sort
npm run customization:test #42 — custom perfume/bottle, server-priced, file validation
npm run checkout:test     # 116 — cart, coupons, COD checkout, order pipeline, stock safety
npm run account:test      #  55 — registration/login/sessions, order ↔ account ownership
npm run settings:test     #  41 — store settings persistence, coupon CRUD + usage limits
npm run upload:test       #  18 — product image/model & customer upload paths (new)
npm run experience:test   #  30 — 3D asset resolution & graceful fallback
```

Each of the 26 flows requested for this phase maps to one or more of the
above, or was walked end to end by hand against a running `next dev` (no
browser-automation tool is available in this environment, so this was
`curl` + a real seeded customer session cookie, not a clicked-through
browser): homepage, fragrance collection with search/filters, a product page
(3D experience *and* its SSR image fallback — confirmed present in the raw
HTML before client hydration), cart, COD checkout, order creation →
confirmation, sign-in → order history → order detail with tracking and
status history, admin login/authorization (an unauthenticated request to any
`/account/*` or `/admin/*` route redirects, never renders), product CRUD,
image/3D-model/customer-upload paths (`upload:test`, real files written to
and removed from disk), order management (status, tracking, cancel), coupons
end to end (an order placed with `DISCOVERY10` showed the correct discount
in both the customer confirmation and — after this phase — the admin order
view too), and store settings. One real gap found and fixed: the admin order
detail page showed a discount amount but not which code earned it.

Mobile/tablet/desktop responsiveness was verified by code review (every
layout uses Tailwind's `sm:`/`lg:` breakpoints consistently, checked in
Phases 1–9) rather than rendered screenshots, for the same reason.

### Production readiness — what actually needs to be true before you demo this

**Configure Supabase before demoing to a client.** The local JSON-file store
(`.data/admin/*.json`) is a zero-setup *offline development* fallback, not a
production database. On Vercel, a serverless function's filesystem is
read-only outside `/tmp`, and each invocation can land on a different,
short-lived instance — so without Supabase configured, admin edits, orders
and uploads will *appear* to succeed (the write is silently dropped —
`local-store.ts`'s disk write catches and swallows the error) but disappear
before your client refreshes the page, or diverge between requests. With the
three `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` variables set,
none of this applies — every write goes through Postgres + Storage, which is
exactly what the whole `AdminRepo` abstraction (`src/lib/admin/repo.ts`) was
built to make a non-event.

### Deploying to Vercel

1. **Push this repo to GitHub/GitLab/Bitbucket**, then in Vercel: **New
   Project → Import** it. Vercel auto-detects Next.js — no `vercel.json`,
   custom build command, or output setting is needed.
2. **Create the Supabase project** (see below) and run its 12 migrations —
   this creates every table, RLS policy, trigger, RPC and the two Storage
   buckets in one pass.
3. **Set the environment variables** (next section) in Vercel → Project →
   Settings → Environment Variables, for the Production (and, if you want a
   staging URL, Preview) environment.
4. **Deploy.** First build takes a few minutes (static product pages are
   pre-rendered at build time — `generateStaticParams` in
   `fragrances/[slug]/page.tsx`).
5. Sign in at `/admin/login` with the Supabase Auth user you promoted to
   `admin` (see "Admin setup" below) and confirm the header shows a green
   **Supabase** badge, not the amber **Local store** one.
6. Place one real Cash-on-Delivery test order end to end and confirm it
   appears in `/admin/orders` — this is the fastest way to catch a
   misconfigured env var before your client sees it.

## Later phases

- Online payment capture (JazzCash / Easypaisa / card) — the registry is ready.
- Transactional email + newsletter.
- Harden `customer-uploads` to a private bucket + signed URLs.
- Saved addresses & wishlist still read from demo data (`src/lib/data/account.ts`).
- Coupon redemptions are not released back on order cancellation — a used
  code stays used even if the order it was applied to is later cancelled.
- Contact form and newsletter sign-up are still client-side demos (explicitly
  labelled) — no backend endpoint exists to wire real validation into yet.

All demo content is temporary and replaceable from `/admin`.
