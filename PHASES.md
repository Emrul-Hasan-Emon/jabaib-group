# Jabaib Clothing Brand — Implementation Roadmap

Single-vendor ecommerce (clothing, Bangladesh market).
Stack: NestJS + TypeORM + PostgreSQL (`server/`), Next.js web app (`web/`).
Prices in BDT. Shipping: Inside Dhaka / Outside Dhaka. Payments: cod / bkash / nagad / card.
Bilingual content (English + Bengali `*BN` columns). Admin panel first, then user panel.

Status per step is one of: **Not Started** / **Completed** / **Skipped**

---

## Phase 0 — Project Foundation & Database

- Scaffold NestJS server (`nest new`, strict TS, npm) — **Completed**
- Install deps: @nestjs/config, @nestjs/typeorm, typeorm, pg, dotenv — **Completed**
- Create `.env` / `.env.example` (DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE, TYPEORM_LOGGING) — **Completed**
- `orm-config.ts` — buildDataSourceOptions (synchronize: false) — **Completed**
- `database.module.ts` — global module, forRootAsync + forFeature — **Completed**
- `database.service.ts` — one Repository per entity — **Completed**
- `data-source.ts` — TypeORM CLI config — **Completed**
- `enums` — OrderStatus, PaymentStatus, PaymentMethod, DeliveryType, OrderReturnStatus, AddressType, CouponType, MediaType — **Completed**
- `BaseEntity` — id, timestamps, soft delete, tracker fields (createdBy, creatorType, creatorName, updatedBy, updaterType, updaterName) — **Completed**
- `DecimalTransformer` for BDT money columns — **Completed**
- Core catalog entities: Category (self-ref parentId), Attribute, AttributeValue, Product, ProductMedia, ProductSKU, ProductSKUVariant, ProductLabel — **Completed**
- Commerce entities: Wishlist, Review, Cart, CartItem, Coupon, CouponHistoryLog, Order, OrderItem, OrderStatusHistory, OrderAddress, OrderReturn, OrderReturnItem, OrderReturnStatusHistory, Payment — **Completed**
- Locations: Country (Bangladesh default), Division (unique slug per country), District (unique slug per division); Address references division/district — **Completed**
- CMS/settings: Banner, HomepageSection, PageSettings, SystemSetting, Language, ShippingZone — **Completed**
- User/AdminUser/AuthProvider entities; AdminUser separate from User — **Completed**
- Every `url` column has matching `path` column (avatarPath, thumbnailPath, imagePath, path...) — **Completed**
- `deliveryType` on Order only (not Address) — **Completed**
- All admin-managed display strings have `*BN` siblings (nameBN, descriptionBN, titleBN, ...) — **Completed**
- Generate initial migration (`typeorm migration:generate`) — **Completed**
- Run migration against dev DB; verify schema in psql — **Completed**
- Seed script: Country=Bangladesh, divisions/districts, shipping zones, default admin user, languages (en/bn) — **Completed**
- Add migration/seed npm scripts; document in README — **Completed**

## Phase 1 — Server: Auth, Roles & Shared Infrastructure

- Configure JWT auth (access token, refresh token strategy) — Not Started
- AdminUser auth module: login, refresh, logout, forgot/reset password — Not Started
- User (customer) auth module: register, login, refresh, Google/Facebook via AuthProvider — Not Started
- Password hashing (bcrypt) + policy — Not Started
- Roles/permissions guard for AdminUser (super_admin, manager, support) — Not Started
- Global exception filter + standard error shape — Not Started
- ValidationPipe (class-validator) + DTO conventions — Not Started
- Request logging interceptor + tracker fields population (createdBy/updaterName) — Not Started
- File upload module (multer/storage → local or S3); store url+path pairs — Not Started
- Pagination/sorting/filtering helper (shared list-query DTO) — Not Started
- Health check endpoint — Not Started

## Phase 2 — Admin Panel: Web Scaffold & Auth

- Scaffold Next.js app in `web/` (App Router, TS, Tailwind, core UI lib) — Not Started
- Admin route group layout: sidebar nav, topbar, breadcrumbs, responsive — Not Started
- API client (fetch wrapper with token refresh, error handling) — Not Started
- Admin login page + auth context/guard (role check) — Not Started
- Dashboard landing page (stats placeholders wired to real counts later) — Not Started
- Language toggle pattern (en/bn) for admin-entered content forms — Not Started

## Phase 3 — Admin: Catalog Management

- Categories CRUD (tree by parentId, image upload url+path, nameBN/descriptionBN, isActive, sortOrder) — Not Started
- Attributes CRUD (name, nameBN) + AttributeValues CRUD (name, nameBN, colorCode, sortOrder) — Not Started
- Products list: search, filter (category, label, isPublished, isFeatured), pagination, sort, bulk activate/deactivate — Not Started
- Product create/edit form: name/nameBN, description/descriptionBN, slug, category, seoTitle/seoDescription (+BN), thumbnail upload, label, flags — Not Started
- Product media manager: upload multiple images/videos (url+path), altText/altTextBN, sortOrder, primary flag — Not Started
- SKU manager: per-product SKUs (sku code, price, salePrice, stock, description/descriptionBN, image url+path), variant selection via ProductSKUVariant — Not Started
- ProductLabels CRUD (name, nameBN, colorCode, isActive) — Not Started
- Wishlist/Review moderation list (hide/delete review, view reviewer + product) — Not Started

## Phase 4 — Admin: Orders, Payments & Returns

- Orders list: status/payment filter, date range, search (orderNumber/phone), pagination — Not Started
- Order detail: items, OrderAddress snapshot, payment info, status history timeline, customer info — Not Started
- Update order status (pending→confirmed→processing→shipped→delivered/cancelled); each change writes OrderStatusHistory — Not Started
- Mark payment received for COD on delivery; record Payment row with method/transactionId — Not Started
- OrderReturn list + detail: reason, items, media, status history — Not Started
- Return workflow: approve/reject → mark refunded/exchanged; write OrderReturnStatusHistory — Not Started
- Admin notes on orders; print/invoice view — Not Started

## Phase 5 — Admin: Customers, Marketing & Settings

- Users (customers) list + detail: orders, addresses, wishlist count, registration source (AuthProvider) — Not Started
- Coupons CRUD: type (flat/percent), value, minOrderTotal, maxDiscount, usageLimit, perUserLimit, startsAt/endsAt, isActive — Not Started
- CouponHistoryLog view (per coupon / per user usage audit) — Not Started
- Banners CRUD: title/titleBN, desktop+mobile images (url+path), linkUrl, position, sortOrder, schedule dates — Not Started
- HomepageSections CRUD: key, title/titleBN, content jsonb, sortOrder, isActive — Not Started
- PageSettings: static pages (about/contact/terms) title/titleBN/content+BN — Not Started
- ShippingZones CRUD: name/nameBN, code (inside_dhaka/outside_dhaka), charge, isActive — Not Started
- SystemSettings: key-value editor (site name, support phone, social links, ...) — Not Started
- Languages management: list en/bn, isDefault, isActive — Not Started
- Country/Division/District management (names + BN), isActive toggles — Not Started
- AdminUser management (super_admin only): create/edit/disable admins — Not Started

## Phase 6 — Admin API Endpoints (NestJS)

Build each resource alongside/behind the admin UI:

- AuthController (admin login/refresh/logout/me) — Not Started
- CategoryController CRUD + tree endpoint — Not Started
- AttributeController + AttributeValueController — Not Started
- ProductController (list/detail/create/update/delete, labels assign) — Not Started
- ProductMediaController (upload/reorder/delete) — Not Started
- ProductSKUController (+ variants) — Not Started
- LabelController, ReviewController (moderation), WishlistController (inspect) — Not Started
- OrderController (list/detail/update-status/note), PaymentController (record) — Not Started
- OrderReturnController (list/detail/update-status) — Not Started
- UserController (list/detail), CouponController, CouponHistoryLogController (read) — Not Started
- BannerController, HomepageSectionController, PageSettingsController, SystemSettingController, LanguageController — Not Started
- ShippingZoneController, LocationController (country/division/district) — Not Started
- AdminUserController (super_admin) — Not Started
- UploadController (shared) — Not Started

## Phase 7 — Admin QA & Hardening

- Unit tests for CatalogService/OrderService status transitions/coupon validation — Not Started
- e2e: admin login → create category/attribute/product/SKU → publish → appears in list — Not Started
- e2e: order status flow writes history; return flow writes history — Not Started
- Permission checks: manager cannot access super_admin endpoints — Not Started
- Audit: tracker fields populated on every create/update — Not Started
- Soft-delete checks on all list queries — Not Started
- Rate limiting/helmet/CORS for admin API — Not Started

## Phase 8 — User Panel: Storefront Foundation

- Next.js public storefront routes (separate layout under `web/`) — Not Started
- API client for public endpoints + customer auth (JWT) — Not Started
- Customer register/login/logout pages; social login buttons (Google/Facebook) — Not Started
- Profile page: edit name/phone, change password — Not Started
- Address book CRUD (division/district dropdowns from LocationController) — Not Started
- Storefront home: banners, homepage sections, featured products (from DB) — Not Started
- Language toggle (en/bn) rendering `*BN` fields with fallback to English — Not Started

## Phase 9 — User Panel: Catalog Browsing

- Category listing page (tree navigation) — Not Started
- Category product listing: filters (price range, size/color attributes), sort (new/price), pagination — Not Started
- Search results page — Not Started
- Product detail: media gallery, SKU/variant selector (size/color), price/salePrice, description EN/BN, related products — Not Started
- Reviews display + submit review (after delivery), rating stars — Not Started
- Wishlist page: add/remove/move-to-cart — Not Started

## Phase 10 — User Panel: Cart, Checkout, Orders

- Cart (guest via session → merge on login), CartItem add/update/remove — Not Started
- Coupon apply: validate (min order, limits, dates, per-user), discount preview, CouponHistoryLog write on order — Not Started
- Checkout: address selection/creation, deliveryType (inside_dhaka/outside_dhaka) → shipping charge from ShippingZone — Not Started
- Payment method select: cod / bkash / nagad / card (manual ref entry first) — Not Started
- Place order → Order + OrderItems + OrderAddress + Payment + CouponHistoryLog + statusHistory in one transaction — Not Started
- Order confirmation page + order detail/history page — Not Started
- Cancel order (if pending), request return (within window) → OrderReturn + items + media — Not Started

## Phase 11 — Public API Endpoints (NestJS)

- AuthController (register/login/refresh/social) — Not Started
- PublicProductController (list/search/detail by slug) — Not Started
- PublicCategoryController (tree), BannerController, HomepageSectionController, PageSettingsController, LanguageController — Not Started
- CartController (guest session + authed), WishlistController, ReviewController (create) — Not Started
- CheckoutController (quote shipping, apply coupon, place order) — Not Started
- OrderController (my orders list/detail/cancel/return) — Not Started
- AddressController (my addresses CRUD), UserController (profile) — Not Started
- Payment callback endpoints (bkash/nagad/card) — Not Started

## Phase 12 — Integration, QA & Launch Prep

- Full user flow e2e: register → browse → cart → coupon → checkout COD → admin confirms → delivered → review — Not Started
- Admin flow e2e: manage catalog → process order → approve return — Not Started
- SEO: product slug pages, metadata EN/BN, sitemap — Not Started
- Performance: image optimization, pagination limits, DB indexes review — Not Started
- Backup/restore runbook for Postgres — Not Started
- Deployment: server (PM2/Docker), web (Vercel/Node), env separation (dev/staging/prod) — Not Started
- Final review of statuses in this file; mark Skipped items with reasons — Not Started
