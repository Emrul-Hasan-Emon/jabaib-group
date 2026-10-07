# Jabaib Clothing Brand — Implementation Roadmap

> Single-vendor ecommerce (clothing, Bangladesh market).
> Stack: **NestJS + TypeORM + PostgreSQL** (`server/`) · **Next.js** (`web/`).
> Prices in BDT · Shipping: Inside Dhaka / Outside Dhaka · Payments: cod / bkash / nagad / card.
> Bilingual content (English + Bengali `*BN` columns) · **Admin panel first, User panel second.**

**Status legend:** ✅ Completed · ⬜ Not Started · ⏭ Skipped

---

## Phase 0 — Project Foundation & Database

| # | Step | Status |
|---|------|--------|
| 1 | Scaffold NestJS server (`nest new`, strict TS, npm) | ✅ Completed |
| 2 | Install deps: @nestjs/config, @nestjs/typeorm, typeorm, pg, dotenv | ✅ Completed |
| 3 | Create `.env` / `.env.example` (DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE, TYPEORM_LOGGING) | ✅ Completed |
| 4 | `orm-config.ts` — buildDataSourceOptions (synchronize: false) | ✅ Completed |
| 5 | `database.module.ts` — global module, forRootAsync + forFeature | ✅ Completed |
| 6 | `database.service.ts` — one Repository per entity | ✅ Completed |
| 7 | `data-source.ts` — TypeORM CLI config | ✅ Completed |
| 8 | `enums` — OrderStatus, PaymentStatus, PaymentMethod, DeliveryType, OrderReturnStatus, AddressType, CouponType, MediaType | ✅ Completed |
| 9 | `BaseEntity` — id, timestamps, soft delete, tracker fields (createdBy, creatorType, creatorName, updatedBy, updaterType, updaterName) | ✅ Completed |
| 10 | `DecimalTransformer` for BDT money columns | ✅ Completed |
| 11 | Core catalog entities: Category (self-ref parentId), Attribute, AttributeValue, Product, ProductMedia, ProductSKU, ProductSKUVariant, ProductLabel | ✅ Completed |
| 12 | Commerce entities: Wishlist, Review, Cart, CartItem, Coupon, CouponHistoryLog, Order, OrderItem, OrderStatusHistory, OrderAddress, OrderReturn, OrderReturnItem, OrderReturnStatusHistory, Payment | ✅ Completed |
| 13 | Locations: Country (Bangladesh default), Division (unique slug per country), District (unique slug per division); Address references division/district | ✅ Completed |
| 14 | CMS/settings: Banner, HomepageSection, PageSettings, SystemSetting, Language, ShippingZone | ✅ Completed |
| 15 | User/AdminUser/AuthProvider entities; AdminUser separate from User | ✅ Completed |
| 16 | Every `url` column has matching `path` column (avatarPath, thumbnailPath, imagePath, path...) | ✅ Completed |
| 17 | `deliveryType` on Order only (not Address) | ✅ Completed |
| 18 | All admin-managed display strings have `*BN` siblings (nameBN, descriptionBN, titleBN, ...) | ✅ Completed |
| 19 | Generate initial migration (`typeorm migration:generate`) | ✅ Completed |
| 20 | Run migration against dev DB; verify schema in psql | ✅ Completed |
| 21 | Seed script: Country=Bangladesh, divisions/districts, shipping zones, default admin user, languages (en/bn) | ✅ Completed |
| 22 | Add migration/seed npm scripts; document in README | ✅ Completed |

## Phase 1 — Server: Auth, Roles & Shared Infrastructure

| # | Step | Status |
|---|------|--------|
| 1 | Configure JWT auth (access token, refresh token strategy) | ✅ Completed |
| 2 | AdminUser auth module: login, refresh (rotated), logout (revoke), me | ✅ Completed |
| 3 | User (customer) auth module: login, refresh (rotated), logout (revoke), me | ✅ Completed |
| 4 | Password hashing (bcrypt) + policy | ✅ Completed |
| 5 | Roles/permissions guard for AdminUser (super_admin, admin, editor) | ✅ Completed |
| 6 | Global exception filter + standard error shape | ✅ Completed |
| 7 | ValidationPipe (class-validator) + DTO conventions | ✅ Completed |
| 8 | Request logging interceptor + tracker fields population (createdBy/updaterName) | ⬜ Not Started |
| 9 | File upload module (FileModule + FileHandleService, local disk storage, upload/delete endpoints) | ✅ Completed |
| 10 | Pagination helper: page-size + cursor params and result shapers | ✅ Completed |
| 11 | Health check endpoint (`GET /` public) | ✅ Completed |

## Phase 2 — Admin Panel: Web Scaffold & Auth

| # | Step | Status |
|---|------|--------|
| 1 | Scaffold Next.js app in `web/` (App Router, TS, Tailwind) | ✅ Completed |
| 2 | Admin route group layout: sidebar nav, topbar, Language toggle, guard, responsive | ✅ Completed |
| 3 | API client (fetch wrapper with token refresh, error handling) | ✅ Completed |
| 4 | Admin login page + auth context/guard (role check) | ✅ Completed |
| 5 | Dashboard landing page (stats placeholders wired to real counts later) | ✅ Completed |
| 6 | Language toggle pattern (en/bn) for admin-entered content forms | ✅ Completed |

## Phase 3 — Admin: Catalog Management

| # | Step | Status |
|---|------|--------|
| 1 | Categories CRUD (tree by parentId, image upload url+path, nameBN/descriptionBN, isActive, sortOrder) | ✅ Completed |
| 2 | Attributes CRUD (name, nameBN) + AttributeValues CRUD (name, nameBN, colorCode, sortOrder) | ✅ Completed |
| 3 | Products list: search, filter (category, collection, isPublished, isFeatured), pagination, sort, bulk activate/deactivate | ✅ Completed |
| 4 | Product create/edit form: name/nameBN, description/descriptionBN, slug, category, thumbnail upload, collection, flags | ✅ Completed |
| 5 | Product media manager: upload multiple images/videos (url+path), altText/altTextBN, sortOrder, primary flag | ✅ Completed |
| 6 | SKU manager: per-product SKUs (sku code, price, salePrice, stock, description/descriptionBN, image url+path), variant selection via ProductSKUVariant | ✅ Completed |
| 7 | Collections CRUD (formerly Product Labels: name, nameBN, colorCode, isActive) | ✅ Completed |
| 8 | Wishlist/Review moderation list (hide/delete review, view reviewer + product) | ✅ Completed |

## Phase 4 — Admin: Orders, Payments & Returns

| # | Step | Status |
|---|------|--------|
| 1 | Orders list: status/payment filter, date range, search (orderNumber/phone), pagination | ✅ Completed |
| 2 | Order detail: items, OrderAddress snapshot, payment info, status history timeline, customer info | ✅ Completed |
| 3 | Update order status (pending→confirmed→processing→shipped→delivered/cancelled); each change writes OrderStatusHistory | ✅ Completed |
| 4 | Mark payment received for COD on delivery; record Payment row with method/transactionId | ✅ Completed |
| 5 | OrderReturn list + detail: reason, items, media, status history | ✅ Completed |
| 6 | Return workflow: approve/reject → mark refunded/exchanged; write OrderReturnStatusHistory | ✅ Completed |
| 7 | Admin notes on orders; print/invoice view | ✅ Completed |

## Catalog, Product, SKU & Order Enhancements

| # | Enhancement | Status |
|---|-------------|--------|
| 1 | Category: slug uniqueness validated on create/update; parent picker renders as a tree; list filters (name substring, active, parent); clearer cover-image upload | ✅ Completed |
| 2 | Attribute: values can be added during attribute create/update (same payload on create); list filters (name, active, value name) | ✅ Completed |
| 3 | Product: category mandatory in UI (DB column nullable via migration); category picker tree; Product Label renamed to **Collection** backend+UI (table `collection`, `collectionId`, `admin/collection`, `user/collection`); SEO fields hidden in create/update/list/details; thumbnail upload/preview improved; list filters (name, category, collection, featured, active); dedicated Product Details page (`/admin/products/[id]`) with media gallery + SKUs; multiple image/video upload saved to `product_media` | ✅ Completed |
| 4 | SKU: created one-by-one with any attributes/values (row-based picker, no hard-coded Size/Color); delete removed — only activate/deactivate; updates restricted to price, discountedPrice, isActive, isDefault | ✅ Completed |
| 5 | Orders: list filters (customer name, mobile, division, district, payment method, startDate/endDate); Payment Method + Payment Status shown as separate columns; status changeable via dropdown on list and detail pages | ✅ Completed |
| 6 | Returns: filters (status, return #, order #, customer name, refund method, date range) | ✅ Completed |

## Phase 5 — Admin: Customers, Marketing & Settings

> Server modules (`customers/`, `marketing/`, `settings/`, `admin-users/`), admin UI pages under `/admin`, and Postman collections (`postman/Jabaib-Customers`, `Jabaib-Marketing`, `Jabaib-Settings`, `Jabaib-AdminUsers`). Demo content seeded by `src/database/seeds/demo-phase5.ts`.

| # | Step | Status |
|---|------|--------|
| 1 | Users (customers) list + detail: orders, addresses, wishlist count, registration source (AuthProvider) | ✅ Completed |
| 2 | Coupons CRUD: type (flat/percent), value, minOrderTotal, maxDiscount, usageLimit, perUserLimit, startsAt/endsAt, isActive | ✅ Completed |
| 3 | CouponHistoryLog view (per coupon / per user usage audit) | ✅ Completed |
| 4 | Banners CRUD: title/titleBN, desktop+mobile images (url+path), linkUrl, position, sortOrder, schedule dates | ✅ Completed |
| 5 | HomepageSections CRUD: key, title/titleBN, content jsonb, sortOrder, isActive | ✅ Completed |
| 6 | PageSettings: static pages (about/contact/terms) title/titleBN/content+BN | ✅ Completed |
| 7 | ShippingZones CRUD: name/nameBN, code (inside_dhaka/outside_dhaka), charge, isActive | ✅ Completed |
| 8 | SystemSettings: key-value editor (site name, support phone, social links, ...) | ✅ Completed |
| 9 | Languages management: list en/bn, isDefault, isActive (only one default) | ✅ Completed |
| 10 | Country/Division/District management (names + BN), isActive toggles, locations tree endpoint | ✅ Completed |
| 11 | AdminUser management (super_admin only): create/edit/disable admins (bcrypt hash, no self-delete, last-super-admin guard) | ✅ Completed |

### Phase 5 — Post-launch Enhancements

| # | Enhancement | Status |
|---|-------------|--------|
| 1 | Coupon list: date-range filter returns coupons **eligible/active within** the window (validity overlap, not created-then); invalid dates or start>end → 400 | ✅ Completed |
| 2 | Coupon list: "Limit/user" column added; `perUserLimit: 0` renders as ∞ (no cap), consistent with `usageLimit: 0` | ✅ Completed |
| 3 | Coupon history: customer-name (substring, case-insensitive), mobile, order number, date-range filters on `log.createdAt`; `userId` filter removed from API and UI | ✅ Completed |
| 4 | Banner form: reused `ImageUploadField` (drag & drop, preview, replace/remove) for desktop + mobile images | ✅ Completed |
| 5 | Admin user form: round avatar upload via `ImageUploadField`; entity `imageUrl`/`imagePath` added (+ migration `AdminUserImage`); admin-users list shows avatar thumbnails with initials fallback | ✅ Completed |
| 6 | Category pickers render as a tree across Product create, Category create/update, products filter, and categories page parent dropdown — switched to purpose-built `/v1/admin/category/tree` + `flattenCategoryTree` helper (was hitting capped `?size=200`) | ✅ Completed |
| 7 | Postman collections completed/audited: `generate-extra.js` split into per-module `Jabaib-Orders`, `Jabaib-Users`, `Jabaib-Locations`, `Jabaib-Moderation`; Settings locations CRUD moved to `Jabaib-Locations`; `Jabaib-Collections` fixed (product-label → collection); SKUs "Delete" replaced with deactivate; `audit-postman.js` verifies **136/136** live routes covered, 0 stale | ✅ Completed |
| 8 | **Feature-wise file handling**: every file-enabled feature owns its full file lifecycle through its own admin controller — `POST …/upload-image` (stages file) + `DELETE …/:id/image` (deletes physical file + clears DB refs) on Category, Product (thumbnail), Product SKU, Banner (desktop/mobile/`kind=`), Homepage Section, Admin User; Product Media gets `POST /v1/admin/product/media/upload-image` (single) + `POST /v1/admin/product/media/upload-many` (batch, up to 20 files in one request) and file deletion on media remove/update. Folder mapping is centralized in `src/file/upload-folders.ts` (Category→category, Product→product, SKU→product/sku, Media→product/media, Banner→banner, Homepage→homepage, Admin→admin …); folders (incl. nested) are auto-created before upload; replacing a file deletes the superseded file; generic `/v1/file/*` endpoints removed; UI uploads routed per-feature via `uploadImage(file, feature)` / `uploadManyImages(files, feature)`; `Jabaib-File` regenerated feature-wise by `generate-files.js` | ✅ Completed |

## Phase 6 — Admin API Endpoints (NestJS)

> Each resource is built alongside/behind the admin UI.
> ✅ All 14 steps completed — verified against the live Swagger surface (138 route/method endpoints covered by Postman, audit green).

| # | Step | Status |
|---|------|--------|
| 1 | AuthController (admin login/refresh/logout/me) | ✅ Completed |
| 2 | CategoryController CRUD + tree endpoint | ✅ Completed |
| 3 | AttributeController + AttributeValueController | ✅ Completed |
| 4 | ProductController (list/detail/create/update/delete) | ✅ Completed — "labels assign" retired: labels were replaced by Collection assignment (`collectionId` on product create/update) in Phase 5 |
| 5 | ProductMediaController (upload/reorder/delete) | ✅ Completed — upload single (`media/upload-image`) + batch (`media/upload-many`); gallery reorder `PUT /v1/admin/product/:id/media/reorder` (full ordered id list, `sortOrder` derived from position) added in this pass; delete removes the physical file + row |
| 6 | ProductSKUController (+ variants) | ✅ Completed — variants via `POST /:productId/skus`; SKU delete replaced with deactivate (Phase 5 decision) |
| 7 | LabelController, ReviewController (moderation), WishlistController (inspect) | ✅ Completed — LabelController retired with the labels feature (collections took over); Review moderation (`GET/PATCH/DELETE /v1/admin/review`) and Wishlist inspect (`GET /v1/admin/wishlist`) are live |
| 8 | OrderController (list/detail/update-status/note), PaymentController (record) | ✅ Completed — `GET /v1/admin/order`, `GET /:id`, `PATCH /:id/status`, `PATCH /:id/note`, `POST /:id/payment` (+ `GET /meta/locations`) |
| 9 | OrderReturnController (list/detail/update-status) | ✅ Completed |
| 10 | UserController (list/detail), CouponController, CouponHistoryLogController (read) | ✅ Completed — admin customer list/detail (`/v1/admin/customer`); coupons CRUD + filters; coupon history read (`/v1/admin/coupon-history`, `/v1/admin/coupon/:id/history`) |
| 11 | BannerController, HomepageSectionController, PageSettingsController, SystemSettingController, LanguageController | ✅ Completed — includes `system-setting/grouped`, homepage/banner image endpoints |
| 12 | ShippingZoneController, LocationController (country/division/district) | ✅ Completed — country/division/district CRUD + `country/tree` |
| 13 | AdminUserController (super_admin) | ✅ Completed |
| 14 | UploadController (shared) | ✅ Completed — retired by design in the feature-wise file-handling pass (Phase 5 #8): every feature owns its upload/replace/remove endpoints through its own controller; shared upload folders only (folder map centralized in `src/file/upload-folders.ts`) |

## Phase 7 — Admin QA & Hardening

| # | Step | Status |
|---|------|--------|
| 1 | Unit tests for CatalogService/OrderService status transitions/coupon validation | ✅ Completed |
| 2 | e2e: admin login → create category/attribute/product/SKU → publish → appears in list | ✅ Completed |
| 3 | e2e: order status flow writes history; return flow writes history | ✅ Completed |
| 4 | Permission checks: manager cannot access super_admin endpoints | ✅ Completed |
| 5 | Audit: tracker fields populated on every create/update | ✅ Completed |
| 6 | Soft-delete checks on all list queries | ✅ Completed |
| 7 | Rate limiting/helmet/CORS for admin API | ✅ Completed |

**Phase 7 notes:**
- Unit tests (53 across 6 suites): order status transitions (legal/illegal + history + tracker fields), order-return transitions, coupon validation (date-window overlap, code normalization, dup codes, defaults), `RolesGuard` permission matrix, category create/update tracker + image-cleanup behaviour. Run with `npm test`.
- e2e (12 across 2 suites): spawn the compiled app (`node dist/main`) on a free port headed at a dedicated `jabaib_test` DB (auto-created; schema synchronized from entities) — `npm run test:e2e` builds then runs in-band. No in-process AppModule boot: Jest 30 on Node 22 cannot `require()` the ESM-only `@nestjs/typeorm`/`@nestjs/config` (unit tests map those to `test/unit-mocks.ts`).
- Steps covered by e2e: full admin catalog flow incl. publish, SKU via `variants` pairs, manager → 403 on `/v1/admin/admin-user`, soft-deleted category excluded from list + tree, order PENDING→CONFIRMED writes `statusHistory` with actor, return REQUESTED→APPROVED writes return history + refund fields.
- Permission checks: `RolesGuard` unit matrix (super_admin vs admin/editor/customer) + live 403 e2e.
- Audit fields: tracker columns (`createdBy`/`creatorType`/`creatorName`, `updatedBy`/…) verified on category, order, return, coupon and payment; grep audit confirms every entity-writing service stamps them (only `jwt-manager` — token storage only — does not).
- Soft-delete: verified via live list/tree e2e; fixes found — `ShippingZone.code` column had no SQL `type` (enum-reflected `Object`), now `type: 'varchar'`; coupon `update()` now strips `code` before `Object.assign` so the normalized code survives.
- Hardening: `helmet` (CSP off so Swagger UI's CDN assets load), env-driven CORS allow-list (`CORS_ORIGINS`, default reflects any origin in dev), `@nestjs/throttler` global guard 120 req/min + login endpoints tightened to 10/min (verified 429s live).
- Postman audit stays green 138/138 after Phase 7 (no route changes).

## Phase 8 — User Panel: Storefront Foundation

| # | Step | Status |
|---|------|--------|
| 1 | Next.js public storefront routes (separate layout under `web/`) | ✅ Done |
| 2 | API client for public endpoints + customer auth (JWT) | ✅ Done |
| 3 | Customer register/login/logout pages; social login buttons (Google/Facebook) | ✅ Done |
| 4 | Profile page: edit name/phone, change password | ✅ Done |
| 5 | Address book CRUD (division/district dropdowns from LocationController) | ✅ Done |
| 6 | Storefront home: banners, homepage sections, featured products (from DB) | ✅ Done |
| 7 | Language toggle (en/bn) rendering `*BN` fields with fallback to English | ✅ Done |

**Phase 8 notes:**
- Backend support shipped first: `POST /v1/user/auth/register`, `PATCH /v1/user/auth/profile`, `POST /v1/user/auth/change-password`, `user/address` CRUD + `:id/default`, public `user/location/tree|division|district`, `user/banner`, `user/homepage-section`, and `user/product` (filters `q/categoryId/collectionId/isFeatured`, sorts, `GET slug/:slug` lean summaries + PDP pricing). Register is `@Public` + throttled (10/min); change-password authenticated.
- Storefront (web): landing (BannerHero → CategoryRail → DB product shelves → promo/featured → newsletter), shop (server wrapper + `ShopContent` client with price-range/location/rating filters, price/name sorts, load-more, mobile filter sheet), PDP (`ProductDetailContent`: gallery, variant picker from `skus[].skuVariants`, effective price mirroring discount-window, qty + add-to-bag, related shelf, mobile sticky add bar).
- PDP image gallery (`ProductGallery`): main image with active-thumbnail indicator, compact below-thumbnails (mobile) / left-rail (lg) strip that hides entirely for single-image products, prev/next arrows, swipe-to-change on touch, image counter, graceful broken-image fallback — plus a full-screen zoom viewer (tap image / zoom pill) with pinch-zoom + drag-to-pan (clamped), double-tap and −/+ toggle, Esc/✕/backdrop close, scroll lock, preserving the selected image (verified live: thumbnail switching, counter, arrows, zoom-in scale 1→1.6, reset, close; no-image products show only the placeholder — no gallery controls).
- Customer auth UI (`/user`): AuthShell (split brand panel + form card), social buttons (Google/Facebook; OAuth arrives in the auth phase), register auto-login, panel tabs (Profile/Addresses/Orders), profile edit + change password, addresses CRUD with division→district cascading selects from the location tree.
- Price-sorting uses a correlated SQL subquery on `product_sku` (never JS-sorts after pagination); upload root is served at `/` and web resolves relative `jabaib/...` media via `mediaUrl()`.
- Verified end-to-end in browser on :3011 (register → dashboard → profile update → change password → address add/set-default → logout → login) plus unit 81/81, e2e 12/12, Postman audit 152/152 (0 uncovered, 0 stale).

## Phase 9 — User Panel: Catalog Browsing

| # | Step | Status |
|---|------|--------|
| 1 | Category listing page (tree navigation) | ✅ Complete |
| 2 | Category product listing: filters (price range, size/color attributes), sort (new/price), pagination | ✅ Complete |
| 3 | Search results page | ✅ Complete |
| 4 | Product detail: media gallery, SKU/variant selector (size/color), price/salePrice, description EN/BN, related products | ✅ Complete |
| 5 | Reviews display + submit review (after delivery), rating stars | ✅ Complete |
| 6 | Wishlist page: add/remove/move-to-cart | ✅ Complete |

Notes: `/categories` browse page (subtree-rolled product counts), `/search` reuses the shop
browser via a `basePath` prop, attribute facets (`user/product/facets`) drive pill filters with
live counts + `attrValues` chips. Reviews are moderation-gated (`isApproved=false` on submit;
admin approval publishes them) — verified purchase badges stay off until orders exist (Phase 10).
Wishlist is one row per product; re-adding after removal revives the soft-deleted row so the
`(userId, productId)` unique index stays satisfied. Customer auth (`UserAuthProvider`) is now at
the root layout so storefront hearts/review forms light up, with a `WishlistProvider` under the
site layout. Backend: 161 live routes all covered by Postman; unit 100/100, e2e 18/18.

## Phase 10 — User Panel: Cart, Checkout, Orders

| # | Step | Status |
|---|------|--------|
| 1 | Cart (guest via session → merge on login), CartItem add/update/remove | ✅ Complete |
| 2 | Coupon apply: validate (min order, limits, dates, per-user), discount preview, CouponHistoryLog write on order | ✅ Complete |
| 3 | Checkout: address selection/creation, deliveryType (inside_dhaka/outside_dhaka) → shipping charge from ShippingZone | ✅ Complete |
| 4 | Payment method select: cod / bkash / nagad / card (manual ref entry first) | ✅ Complete |
| 5 | Place order → Order + OrderItems + OrderAddress + Payment + CouponHistoryLog + statusHistory in one transaction | ✅ Complete |
| 6 | Order confirmation page + order detail/history page | ✅ Complete |
| 7 | Cancel order (if pending), request return (within window) → OrderReturn + items + media | ✅ Complete |

**Phase 10 notes:**
- Cart (`src/cart/`): guests are identified by an `x-cart-session` header; the signed-in cart is
  keyed by userId. Prices, stock and totals are always recomputed server-side from the SKU (a
  client-supplied SKU id is validated; no variant means "cheapest in-stock active SKU"), and
  quantities clamp to live stock. `POST user/cart/merge` folds a guest cart into the customer's on
  login, summing per product+SKU.
- Coupon: `GET user/coupon/:code/preview` (public) validates active flag, start/end window, minimum
  order, global usage limit and per-customer limit (from the coupon history), then computes the
  discount (percent capped by `maxDiscountAmount`, flat capped by the subtotal). Previews never
  consume a use; `usedCount` only moves inside the order transaction.
- Checkout: `POST user/checkout/preview` and `POST user/order` re-price the cart, validate stock,
  resolve the address (saved id owned by the caller, or inline) and the ShippingZone charge, then
  write Order + OrderItems + OrderAddress + Payment + CouponHistoryLog + the first status-history row
  in ONE transaction with a guarded stock decrement (`UPDATE … WHERE quantity >= n`). The cart is
  emptied only after the transaction commits.
- Returns: a return can be requested only on a delivered order, within 7 days of the delivered
  status row, and only while no other return is open; per-item quantities are checked against what
  was ordered minus what was already returned. Photos upload through
  `POST user/order/return/upload-image` (feature-wise file handling, `order-return` folder).
- Guard change: `@Public()` routes now attach the user when a valid token is present (optional
  auth), so guests and signed-in customers can share one endpoint (guest cart vs own cart,
  per-customer coupon limits). Invalid tokens simply fall back to guest.
- Web: server-backed cart (guest snapshot in localStorage, handed over to the API on login),
  cart drawer with live totals + savings, `/checkout` (saved or inline address, delivery, coupon,
  payment method + reference, server-computed totals) → `/checkout/success`, and the panel's
  Orders list + detail with timeline, cancel and return-request (item quantities + photos).
- Verified in the browser on :3011 (guest add → login merge → coupon apply → place order → cancel
  and return flows) plus unit 168/168, e2e 29/29, Postman audit 176/176.

## Phase 11 — Public API Endpoints (NestJS)

| # | Step | Status |
|---|------|--------|
| 1 | AuthController (register/login/refresh/social) | ⬜ Not Started |
| 2 | PublicProductController (list/search/detail by slug) | ⬜ Not Started |
| 3 | PublicCategoryController (tree), BannerController, HomepageSectionController, PageSettingsController, LanguageController | ⬜ Not Started |
| 4 | CartController (guest session + authed), WishlistController, ReviewController (create) | ⬜ Not Started |
| 5 | CheckoutController (quote shipping, apply coupon, place order) | ⬜ Not Started |
| 6 | OrderController (my orders list/detail/cancel/return) | ⬜ Not Started |
| 7 | AddressController (my addresses CRUD), UserController (profile) | ⬜ Not Started |
| 8 | Payment callback endpoints (bkash/nagad/card) | ⬜ Not Started |

## Phase 12 — Integration, QA & Launch Prep

| # | Step | Status |
|---|------|--------|
| 1 | Full user flow e2e: register → browse → cart → coupon → checkout COD → admin confirms → delivered → review | ⬜ Not Started |
| 2 | Admin flow e2e: manage catalog → process order → approve return | ⬜ Not Started |
| 3 | SEO: product slug pages, metadata EN/BN, sitemap | ⬜ Not Started |
| 4 | Performance: image optimization, pagination limits, DB indexes review | ⬜ Not Started |
| 5 | Backup/restore runbook for Postgres | ⬜ Not Started |
| 6 | Deployment: server (PM2/Docker), web (Vercel/Node), env separation (dev/staging/prod) | ⬜ Not Started |
| 7 | Final review of statuses in this file; mark Skipped items with reasons | ⬜ Not Started |
