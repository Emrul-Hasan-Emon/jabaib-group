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
| 3 | Products list: search, filter (category, label, isPublished, isFeatured), pagination, sort, bulk activate/deactivate | ✅ Completed |
| 4 | Product create/edit form: name/nameBN, description/descriptionBN, slug, category, seoTitle/seoDescription (+BN), thumbnail upload, label, flags | ✅ Completed |
| 5 | Product media manager: upload multiple images/videos (url+path), altText/altTextBN, sortOrder, primary flag | ✅ Completed |
| 6 | SKU manager: per-product SKUs (sku code, price, salePrice, stock, description/descriptionBN, image url+path), variant selection via ProductSKUVariant | ✅ Completed |
| 7 | ProductLabels CRUD (name, nameBN, colorCode, isActive) | ✅ Completed |
| 8 | Wishlist/Review moderation list (hide/delete review, view reviewer + product) | ⬜ Not Started |

## Phase 4 — Admin: Orders, Payments & Returns

| # | Step | Status |
|---|------|--------|
| 1 | Orders list: status/payment filter, date range, search (orderNumber/phone), pagination | ⬜ Not Started |
| 2 | Order detail: items, OrderAddress snapshot, payment info, status history timeline, customer info | ⬜ Not Started |
| 3 | Update order status (pending→confirmed→processing→shipped→delivered/cancelled); each change writes OrderStatusHistory | ⬜ Not Started |
| 4 | Mark payment received for COD on delivery; record Payment row with method/transactionId | ⬜ Not Started |
| 5 | OrderReturn list + detail: reason, items, media, status history | ⬜ Not Started |
| 6 | Return workflow: approve/reject → mark refunded/exchanged; write OrderReturnStatusHistory | ⬜ Not Started |
| 7 | Admin notes on orders; print/invoice view | ⬜ Not Started |

## Phase 5 — Admin: Customers, Marketing & Settings

| # | Step | Status |
|---|------|--------|
| 1 | Users (customers) list + detail: orders, addresses, wishlist count, registration source (AuthProvider) | ⬜ Not Started |
| 2 | Coupons CRUD: type (flat/percent), value, minOrderTotal, maxDiscount, usageLimit, perUserLimit, startsAt/endsAt, isActive | ⬜ Not Started |
| 3 | CouponHistoryLog view (per coupon / per user usage audit) | ⬜ Not Started |
| 4 | Banners CRUD: title/titleBN, desktop+mobile images (url+path), linkUrl, position, sortOrder, schedule dates | ⬜ Not Started |
| 5 | HomepageSections CRUD: key, title/titleBN, content jsonb, sortOrder, isActive | ⬜ Not Started |
| 6 | PageSettings: static pages (about/contact/terms) title/titleBN/content+BN | ⬜ Not Started |
| 7 | ShippingZones CRUD: name/nameBN, code (inside_dhaka/outside_dhaka), charge, isActive | ⬜ Not Started |
| 8 | SystemSettings: key-value editor (site name, support phone, social links, ...) | ⬜ Not Started |
| 9 | Languages management: list en/bn, isDefault, isActive | ⬜ Not Started |
| 10 | Country/Division/District management (names + BN), isActive toggles | ⬜ Not Started |
| 11 | AdminUser management (super_admin only): create/edit/disable admins | ⬜ Not Started |

## Phase 6 — Admin API Endpoints (NestJS)

> Each resource is built alongside/behind the admin UI.

| # | Step | Status |
|---|------|--------|
| 1 | AuthController (admin login/refresh/logout/me) | ⬜ Not Started |
| 2 | CategoryController CRUD + tree endpoint | ⬜ Not Started |
| 3 | AttributeController + AttributeValueController | ⬜ Not Started |
| 4 | ProductController (list/detail/create/update/delete, labels assign) | ⬜ Not Started |
| 5 | ProductMediaController (upload/reorder/delete) | ⬜ Not Started |
| 6 | ProductSKUController (+ variants) | ⬜ Not Started |
| 7 | LabelController, ReviewController (moderation), WishlistController (inspect) | ⬜ Not Started |
| 8 | OrderController (list/detail/update-status/note), PaymentController (record) | ⬜ Not Started |
| 9 | OrderReturnController (list/detail/update-status) | ⬜ Not Started |
| 10 | UserController (list/detail), CouponController, CouponHistoryLogController (read) | ⬜ Not Started |
| 11 | BannerController, HomepageSectionController, PageSettingsController, SystemSettingController, LanguageController | ⬜ Not Started |
| 12 | ShippingZoneController, LocationController (country/division/district) | ⬜ Not Started |
| 13 | AdminUserController (super_admin) | ⬜ Not Started |
| 14 | UploadController (shared) | ⬜ Not Started |

## Phase 7 — Admin QA & Hardening

| # | Step | Status |
|---|------|--------|
| 1 | Unit tests for CatalogService/OrderService status transitions/coupon validation | ⬜ Not Started |
| 2 | e2e: admin login → create category/attribute/product/SKU → publish → appears in list | ⬜ Not Started |
| 3 | e2e: order status flow writes history; return flow writes history | ⬜ Not Started |
| 4 | Permission checks: manager cannot access super_admin endpoints | ⬜ Not Started |
| 5 | Audit: tracker fields populated on every create/update | ⬜ Not Started |
| 6 | Soft-delete checks on all list queries | ⬜ Not Started |
| 7 | Rate limiting/helmet/CORS for admin API | ⬜ Not Started |

## Phase 8 — User Panel: Storefront Foundation

| # | Step | Status |
|---|------|--------|
| 1 | Next.js public storefront routes (separate layout under `web/`) | ⬜ Not Started |
| 2 | API client for public endpoints + customer auth (JWT) | ⬜ Not Started |
| 3 | Customer register/login/logout pages; social login buttons (Google/Facebook) | ⬜ Not Started |
| 4 | Profile page: edit name/phone, change password | ⬜ Not Started |
| 5 | Address book CRUD (division/district dropdowns from LocationController) | ⬜ Not Started |
| 6 | Storefront home: banners, homepage sections, featured products (from DB) | ⬜ Not Started |
| 7 | Language toggle (en/bn) rendering `*BN` fields with fallback to English | ⬜ Not Started |

## Phase 9 — User Panel: Catalog Browsing

| # | Step | Status |
|---|------|--------|
| 1 | Category listing page (tree navigation) | ⬜ Not Started |
| 2 | Category product listing: filters (price range, size/color attributes), sort (new/price), pagination | ⬜ Not Started |
| 3 | Search results page | ⬜ Not Started |
| 4 | Product detail: media gallery, SKU/variant selector (size/color), price/salePrice, description EN/BN, related products | ⬜ Not Started |
| 5 | Reviews display + submit review (after delivery), rating stars | ⬜ Not Started |
| 6 | Wishlist page: add/remove/move-to-cart | ⬜ Not Started |

## Phase 10 — User Panel: Cart, Checkout, Orders

| # | Step | Status |
|---|------|--------|
| 1 | Cart (guest via session → merge on login), CartItem add/update/remove | ⬜ Not Started |
| 2 | Coupon apply: validate (min order, limits, dates, per-user), discount preview, CouponHistoryLog write on order | ⬜ Not Started |
| 3 | Checkout: address selection/creation, deliveryType (inside_dhaka/outside_dhaka) → shipping charge from ShippingZone | ⬜ Not Started |
| 4 | Payment method select: cod / bkash / nagad / card (manual ref entry first) | ⬜ Not Started |
| 5 | Place order → Order + OrderItems + OrderAddress + Payment + CouponHistoryLog + statusHistory in one transaction | ⬜ Not Started |
| 6 | Order confirmation page + order detail/history page | ⬜ Not Started |
| 7 | Cancel order (if pending), request return (within window) → OrderReturn + items + media | ⬜ Not Started |

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
