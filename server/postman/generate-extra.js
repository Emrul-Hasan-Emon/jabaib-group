#!/usr/bin/env node
/**
 * Generates the per-module Postman collections for endpoints that do NOT have
 * a dedicated collection: Orders, Users (storefront catalog), Locations, and
 * Moderation (reviews & wishlists).
 *
 * Each module gets its OWN collection file so future APIs for that module can
 * be added to it. Run: node postman/generate-extra.js
 * Then: node postman/audit-postman.js
 */
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';

/** Guests identify their cart with this header. */
const CART_SESSION = [{ key: 'x-cart-session', value: 'postman-guest-cart-0001' }];

function authHeaders() {
  return [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Authorization', value: 'Bearer {{adminAccessToken}}' },
  ];
}

function request({ method, path: pathArr, body, query, useUserToken, headers }) {
  const url = {
    raw: `${BASE}/v1/${pathArr.join('/')}`,
    host: [BASE],
    path: ['v1', ...pathArr],
  };
  if (query && query.length) {
    url.raw = `${BASE}/v1/${pathArr.join('/')}?${query
      .map((q) => `${q.key}=${q.value}`)
      .join('&')}`;
    url.query = query.map((q) => ({ key: q.key, value: q.value }));
  }
  const header = useUserToken
    ? [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer {{userAccessToken}}' },
      ]
    : authHeaders();
  const item = { method, header: [...header, ...(headers ?? [])], url };
  if (body) {
    item.body = { mode: 'raw', raw: JSON.stringify(body, null, 2) };
  }
  return item;
}

function folder(name, items) {
  return { name, item: items };
}

function loginItem(label, tokenVar, refreshVar, pathArr, body) {
  return {
    name: label,
    request: {
      method: 'POST',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      url: {
        raw: `${BASE}/v1/${pathArr.join('/')}`,
        host: [BASE],
        path: ['v1', ...pathArr],
      },
      body: { mode: 'raw', raw: JSON.stringify(body, null, 2) },
    },
    event: [
      {
        listen: 'test',
        script: {
          exec: [
            'const res = pm.response.json();',
            `pm.collectionVariables.set('${tokenVar}', res.accessToken);`,
            `pm.collectionVariables.set('${refreshVar}', res.refreshToken);`,
          ],
        },
      },
    ],
  };
}

function makeCollection(name, id, description, items) {
  return {
    info: {
      name: `Jabaib API — ${name}`,
      _postman_id: id,
      description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'baseUrl', value: BASE },
      { key: 'adminAccessToken', value: '' },
      { key: 'adminRefreshToken', value: '' },
      { key: 'userAccessToken', value: '' },
      { key: 'userRefreshToken', value: '' },
    ],
    item: [
      {
        name: 'Auth',
        item: [
          loginItem('Admin login (sets adminAccessToken)', 'adminAccessToken', 'adminRefreshToken', ['admin', 'auth', 'login'], { email: 'admin@jabaib.com', password: 'Admin@12345' }),
          loginItem('User login (sets userAccessToken)', 'userAccessToken', 'userRefreshToken', ['user', 'auth', 'login'], { emailOrPhone: 'customer@example.com', password: 'Secret@123' }),
        ],
      },
      ...items,
    ],
  };
}

// ---------------------------------------------------------------- Orders ----
const orders = makeCollection(
  'Orders',
  'jabaib-orders-collection',
  'Orders + returns. List/detail with status transitions, payment recording, notes, and returns.',
  [
    folder('Orders', [
      { name: 'List (filters: status, paymentStatus, paymentMethod, q, customerName, mobile, divisionId, districtId, date range)', request: request({ method: 'GET', path: ['admin', 'order'], query: [{ key: 'page', value: '0' }, { key: 'size', value: '10' }, { key: 'status', value: '' }, { key: 'paymentStatus', value: '' }, { key: 'paymentMethod', value: '' }, { key: 'q', value: '' }, { key: 'customerName', value: '' }, { key: 'mobile', value: '' }, { key: 'divisionId', value: '' }, { key: 'districtId', value: '' }, { key: 'startDate', value: '' }, { key: 'endDate', value: '' }] }) },
      { name: 'Detail', request: request({ method: 'GET', path: ['admin', 'order', '1'] }) },
      { name: 'Divisions → districts (filter dropdowns)', request: request({ method: 'GET', path: ['admin', 'order', 'meta', 'locations'] }) },
      { name: 'Update status (writes history)', request: request({ method: 'PATCH', path: ['admin', 'order', '1', 'status'], body: { status: 'processing', note: 'Confirmed by phone' } }) },
      { name: 'Add note', request: request({ method: 'PATCH', path: ['admin', 'order', '1', 'note'], body: { note: 'Customer requested delivery after 6pm' } }) },
      { name: 'Record payment (COD received)', request: request({ method: 'POST', path: ['admin', 'order', '1', 'payment'], body: { transactionId: '', amount: 2100 } }) },
    ]),
    // The gateway callback is PUBLIC (no bearer token) — the provider signs it
    // with x-callback-signature when PAYMENT_CALLBACK_SECRET is configured.
    folder('Payment Callbacks', [
      ...['bkash', 'nagad', 'card'].map((provider) => ({
        name: `Callback \u2014 ${provider}`,
        request: request({
          method: 'POST',
          path: ['payment', 'callback', provider],
          body: { orderId: 1, transactionId: 'TXN123', status: 'success', amount: 2100 },
        }),
      })),
    ]),
    folder('Payment Gateways', [
      { name: 'List (filters: q, type, isManual, isActive)', request: request({ method: 'GET', path: ['admin', 'payment-gateway'], query: [{ key: 'page', value: '0' }, { key: 'size', value: '10' }, { key: 'q', value: '' }, { key: 'type', value: '' }, { key: 'isManual', value: '' }, { key: 'isActive', value: '' }] }) },
      { name: 'Detail', request: request({ method: 'GET', path: ['admin', 'payment-gateway', '1'] }) },
      { name: 'Create manual MFS (slug is generated)', request: request({ method: 'POST', path: ['admin', 'payment-gateway'], body: { name: 'bKash', nameBN: 'বিকাশ', type: 'mfs', isManual: true, accountName: 'Jabaib Fashion Ltd.', accountNumber: '01700000000', description: '<p>Send the <strong>total</strong> to the number below.</p>' } }) },
      { name: 'Create manual bank transfer', request: request({ method: 'POST', path: ['admin', 'payment-gateway'], body: { name: 'DBBL Transfer', nameBN: 'ডিবিবিএল ট্রান্সফার', type: 'bank', isManual: true, accountName: 'Jabaib Fashion Ltd.', accountNumber: '01700000000', bankName: 'Dutch-Bangla Bank', branchName: 'Dhanmondi Branch' } }) },
      { name: 'Create automated gateway (requires provider)', request: request({ method: 'POST', path: ['admin', 'payment-gateway'], body: { name: 'Nagad Auto', nameBN: 'নগদ অটো', type: 'mfs', isManual: false, provider: 'nagad' } }) },
      { name: 'Update', request: request({ method: 'PATCH', path: ['admin', 'payment-gateway', '1'], body: { isActive: true } }) },
      { name: 'Delete', request: request({ method: 'DELETE', path: ['admin', 'payment-gateway', '1'] }) },
      { name: 'Upload icon', request: request({ method: 'POST', path: ['admin', 'payment-gateway', 'upload-icon'] }) },
      { name: 'Remove icon', request: request({ method: 'DELETE', path: ['admin', 'payment-gateway', '1', 'icon'] }) },
    ]),
    folder('Order Returns', [
      { name: 'List', request: request({ method: 'GET', path: ['admin', 'order-return'], query: [{ key: 'page', value: '0' }, { key: 'size', value: '10' }] }) },
      { name: 'Detail', request: request({ method: 'GET', path: ['admin', 'order-return', '1'] }) },
      { name: 'Update status (requested → approved/… → refunded)', request: request({ method: 'PATCH', path: ['admin', 'order-return', '1', 'status'], body: { status: 'approved', note: 'Item received in good condition', refundAmount: 1390, refundMethod: 'bkash' } }) },
    ]),
  ],
);

// ----------------------------------------------------- Users (storefront) ----
const users = makeCollection(
  'Users (Storefront)',
  'jabaib-users-collection',
  'Storefront: public browsing (products, categories, banners, homepage sections, locations) plus the authenticated customer account area (register, profile, addresses).',
  [
    folder('Auth (customer)', [
      { name: 'Register (auto-login)', request: request({ method: 'POST', path: ['user', 'auth', 'register'], body: { name: 'Rafi Ahmed', email: 'customer@example.com', phone: '01712345678', password: 'Secret@123' } }) },
      { name: 'Update profile', request: request({ method: 'PATCH', path: ['user', 'auth', 'profile'], body: { name: 'Rafi Ahmed', phone: '01812345678' }, useUserToken: true }) },
      { name: 'Change password', request: request({ method: 'POST', path: ['user', 'auth', 'change-password'], body: { currentPassword: 'Secret@123', newPassword: 'NewSecret@123' }, useUserToken: true }) },
    ]),
    folder('Payment Gateways', [
      { name: 'Active gateways (checkout options)', request: request({ method: 'GET', path: ['user', 'payment-gateway'] }) },
      { name: 'Checkout preview with a manual gateway', request: request({ method: 'POST', path: ['user', 'checkout', 'preview'], body: { deliveryType: 'inside_dhaka', paymentMethod: 'cod', paymentGatewayId: 1, paymentMetaData: { txnId: 'TXN123456' } }, useUserToken: true }) },
    ]),
    folder('Categories', [
      { name: 'List', request: request({ method: 'GET', path: ['user', 'category'], useUserToken: true }) },
      { name: 'Active tree', request: request({ method: 'GET', path: ['user', 'category', 'tree'], useUserToken: true }) },
    ]),
    folder('Collections', [
      { name: 'List', request: request({ method: 'GET', path: ['user', 'collection'], useUserToken: true }) },
    ]),
    folder('Products', [
      { name: 'List (filters: q, categoryId, collectionId, isFeatured, attrValues, sort)', request: request({ method: 'GET', path: ['user', 'product'], query: [{ key: 'page', value: '0' }, { key: 'size', value: '10' }, { key: 'q', value: '' }, { key: 'categoryId', value: '' }, { key: 'collectionId', value: '' }, { key: 'isFeatured', value: '' }, { key: 'attrValues', value: '' }, { key: 'sort', value: 'newest' }], useUserToken: true }) },
      { name: 'Facet counts (category/collection/q scope, e.g. size/color)', request: request({ method: 'GET', path: ['user', 'product', 'facets'], query: [{ key: 'categoryId', value: '' }, { key: 'collectionId', value: '' }, { key: 'q', value: '' }], useUserToken: true }) },
      { name: 'Detail by slug', request: request({ method: 'GET', path: ['user', 'product', 'slug', 'example-product'], useUserToken: true }) },
      { name: 'Detail by id', request: request({ method: 'GET', path: ['user', 'product', '1'], useUserToken: true }) },
    ]),
    folder('Attributes', [
      { name: 'List', request: request({ method: 'GET', path: ['user', 'attribute'], useUserToken: true }) },
    ]),
    folder('Reviews (customer)', [
      { name: 'Product reviews + rating summary', request: request({ method: 'GET', path: ['user', 'review', 'product', '1'], query: [{ key: 'page', value: '0' }, { key: 'size', value: '10' }], useUserToken: true }) },
      { name: 'My reviews (moderation status)', request: request({ method: 'GET', path: ['user', 'review', 'my'], query: [{ key: 'page', value: '0' }, { key: 'size', value: '10' }], useUserToken: true }) },
      { name: 'Submit review (pending moderation)', request: request({ method: 'POST', path: ['user', 'review'], body: { productId: 1, rating: 5, comment: 'Great quality fabric, true to size.' }, useUserToken: true }) },
      { name: 'Delete my review', request: request({ method: 'DELETE', path: ['user', 'review', '1'], useUserToken: true }) },
    ]),
    folder('Wishlist (customer)', [
      { name: 'My wishlist (product summaries)', request: request({ method: 'GET', path: ['user', 'wishlist'], useUserToken: true }) },
      { name: 'My wishlist ids (heart states)', request: request({ method: 'GET', path: ['user', 'wishlist', 'ids'], useUserToken: true }) },
      { name: 'Add to wishlist', request: request({ method: 'POST', path: ['user', 'wishlist', '1'], useUserToken: true }) },
      { name: 'Remove from wishlist', request: request({ method: 'DELETE', path: ['user', 'wishlist', '1'], useUserToken: true }) },
    ]),
    folder('Cart (customer / guest)', [
      { name: 'My cart (guest: send x-cart-session; signed-in: token wins)', request: request({ method: 'GET', path: ['user', 'cart'], headers: CART_SESSION }) },
      { name: 'Issue a fresh guest cart session id', request: request({ method: 'POST', path: ['user', 'cart', 'session'] }) },
      { name: 'Add item (omit productSKUId to let the server pick the cheapest in-stock SKU)', request: request({ method: 'POST', path: ['user', 'cart', 'items'], body: { productId: 1, productSKUId: 1, quantity: 2 }, headers: CART_SESSION }) },
      { name: 'Change quantity (clamped to live stock)', request: request({ method: 'PATCH', path: ['user', 'cart', 'items', '1'], body: { quantity: 3 }, headers: CART_SESSION }) },
      { name: 'Remove one line', request: request({ method: 'DELETE', path: ['user', 'cart', 'items', '1'], headers: CART_SESSION }) },
      { name: 'Empty the cart', request: request({ method: 'DELETE', path: ['user', 'cart'], headers: CART_SESSION }) },
      { name: 'Merge the guest cart into mine (right after login)', request: request({ method: 'POST', path: ['user', 'cart', 'merge'], body: { sessionId: 'postman-guest-cart-0001' }, useUserToken: true }) },
    ]),
    folder('Coupons (customer)', [
      { name: 'Preview a coupon against a basket subtotal (never consumes a use)', request: request({ method: 'GET', path: ['user', 'coupon', 'EID25', 'preview'], query: [{ key: 'subtotal', value: '2000' }], useUserToken: true }) },
    ]),
    folder('Checkout (customer)', [
      { name: 'Preview totals (address, delivery charge from ShippingZone, coupon, total)', request: request({ method: 'POST', path: ['user', 'checkout', 'preview'], body: { addressId: 1, deliveryType: 'inside_dhaka', paymentMethod: 'cod', couponCode: 'EID25' }, useUserToken: true }) },
      { name: 'Preview totals with an inline address + online payment reference', request: request({ method: 'POST', path: ['user', 'checkout', 'preview'], body: { recipientName: 'Rafi Ahmed', phone: '01712345678', address: 'House 12, Road 5, Dhanmondi', divisionId: 1, districtId: 240, zipCode: '1205', deliveryType: 'outside_dhaka', paymentMethod: 'bkash', transactionId: '9ABC123XYZ' }, useUserToken: true }) },
    ]),
    folder('Orders (customer)', [
      { name: 'My orders (paginated, newest first)', request: request({ method: 'GET', path: ['user', 'order'], query: [{ key: 'page', value: '0' }, { key: 'size', value: '10' }], useUserToken: true }) },
      { name: 'Order detail (items, timeline, payments, returns, canCancel/canReturn)', request: request({ method: 'GET', path: ['user', 'order', '1'], useUserToken: true }) },
      { name: 'Place order (atomic: order + items + address + payment + coupon usage)', request: request({ method: 'POST', path: ['user', 'order'], body: { addressId: 1, deliveryType: 'inside_dhaka', paymentMethod: 'cod', couponCode: 'EID25', note: 'Please call before delivery' }, useUserToken: true }) },
      { name: 'Place order with bkash + transaction reference', request: request({ method: 'POST', path: ['user', 'order'], body: { recipientName: 'Rafi Ahmed', phone: '01712345678', address: 'House 12, Road 5, Dhanmondi', deliveryType: 'outside_dhaka', paymentMethod: 'bkash', transactionId: '9ABC123XYZ' }, useUserToken: true }) },
      { name: 'Cancel my order (only while pending)', request: request({ method: 'POST', path: ['user', 'order', '1', 'cancel'], body: { reason: 'Ordered by mistake' }, useUserToken: true }) },
      { name: 'Request a return (delivered orders, inside the 7-day window)', request: request({ method: 'POST', path: ['user', 'order', '1', 'return'], body: { reason: 'Fabric colour is different from the photo', items: [{ orderItemId: 1, quantity: 1, reason: 'Wrong shade' }], media: ['jabaib/order-return/photo.png'] }, useUserToken: true }) },
      { name: 'Upload a return photo (then attach the returned path)', request: request({ method: 'POST', path: ['user', 'order', 'return', 'upload-image'], useUserToken: true }) },
    ]),
    folder('Banners', [
      { name: 'Active banners (optional ?position=hero)', request: request({ method: 'GET', path: ['user', 'banner'], query: [{ key: 'position', value: 'hero' }], useUserToken: true }) },
    ]),
    folder('Homepage sections', [
      { name: 'Active sections (content resolved)', request: request({ method: 'GET', path: ['user', 'homepage-section'], useUserToken: true }) },
    ]),
    folder('Locations (public)', [
      { name: 'Countries → divisions → districts', request: request({ method: 'GET', path: ['user', 'location', 'tree'], useUserToken: true }) },
      { name: 'Divisions by country', request: request({ method: 'GET', path: ['user', 'location', 'division'], query: [{ key: 'countryId', value: '1' }], useUserToken: true }) },
      { name: 'Districts by division', request: request({ method: 'GET', path: ['user', 'location', 'district'], query: [{ key: 'divisionId', value: '1' }], useUserToken: true }) },
    ]),
    folder('Address book', [
      { name: 'My addresses', request: request({ method: 'GET', path: ['user', 'address'], useUserToken: true }) },
      { name: 'Add address (default)', request: request({ method: 'POST', path: ['user', 'address'], body: { recipientName: 'Rafi Ahmed', phone: '01712345678', address: 'House 12, Road 5, Dhanmondi', divisionId: 1, districtId: 240, zipCode: '1205', isDefault: true }, useUserToken: true }) },
      { name: 'Update address', request: request({ method: 'PATCH', path: ['user', 'address', '1'], body: { address: 'House 14, Road 7, Dhanmondi', zipCode: '1205' }, useUserToken: true }) },
      { name: 'Set default address', request: request({ method: 'POST', path: ['user', 'address', '1', 'default'], useUserToken: true }) },
      { name: 'Delete address', request: request({ method: 'DELETE', path: ['user', 'address', '1'], useUserToken: true }) },
    ]),
  ],
);

// ------------------------------------------------------------- Locations ----
const locations = makeCollection(
  'Locations',
  'jabaib-locations-collection',
  'Country / division / district administration. Tree view plus per-resource CRUD.',
  [
    folder('Locations', [
      { name: 'Locations tree', request: request({ method: 'GET', path: ['admin', 'country', 'tree'] }) },
      { name: 'Countries list', request: request({ method: 'GET', path: ['admin', 'country'], query: [{ key: 'page', value: '0' }, { key: 'size', value: '10' }] }) },
      { name: 'Country detail', request: request({ method: 'GET', path: ['admin', 'country', '1'] }) },
      { name: 'Create country', request: request({ method: 'POST', path: ['admin', 'country'], body: { name: 'Bangladesh', nameBN: 'বাংলাদেশ', code: 'BD', currency: 'BDT', isActive: true } }) },
      { name: 'Update country', request: request({ method: 'PATCH', path: ['admin', 'country', '1'], body: { currency: 'BDT', isActive: true } }) },
      { name: 'Delete country', request: request({ method: 'DELETE', path: ['admin', 'country', ':id'] }) },
      { name: 'Divisions list (filter by country)', request: request({ method: 'GET', path: ['admin', 'division'], query: [{ key: 'page', value: '0' }, { key: 'size', value: '10' }, { key: 'countryId', value: '1' }] }) },
      { name: 'Division detail', request: request({ method: 'GET', path: ['admin', 'division', '1'] }) },
      { name: 'Create division', request: request({ method: 'POST', path: ['admin', 'division'], body: { name: 'Dhaka', nameBN: 'ঢাকা', countryId: 1, isActive: true } }) },
      { name: 'Update division', request: request({ method: 'PATCH', path: ['admin', 'division', '1'], body: { name: 'Dhaka', nameBN: 'ঢাকা', isActive: true } }) },
      { name: 'Delete division', request: request({ method: 'DELETE', path: ['admin', 'division', ':id'] }) },
      { name: 'Districts list (filter by division)', request: request({ method: 'GET', path: ['admin', 'district'], query: [{ key: 'page', value: '0' }, { key: 'size', value: '10' }, { key: 'divisionId', value: '1' }] }) },
      { name: 'District detail', request: request({ method: 'GET', path: ['admin', 'district', '1'] }) },
      { name: 'Create district', request: request({ method: 'POST', path: ['admin', 'district'], body: { name: 'Gulshan', countryId: 1, divisionId: 1, isActive: true } }) },
      { name: 'Update district', request: request({ method: 'PATCH', path: ['admin', 'district', '1'], body: { name: 'Gulshan Model Town', isActive: true } }) },
      { name: 'Delete district', request: request({ method: 'DELETE', path: ['admin', 'district', ':id'] }) },
    ]),
  ],
);

// ----------------------------------------------------------- Moderation -----
const moderation = makeCollection(
  'Moderation',
  'jabaib-moderation-collection',
  'Admin moderation: review list/detail/approve/hide/delete and the wishlist audit.',
  [
    folder('Reviews', [
      { name: 'List (filters: isApproved, productId, userId, q)', request: request({ method: 'GET', path: ['admin', 'review'], query: [{ key: 'page', value: '0' }, { key: 'size', value: '10' }, { key: 'isApproved', value: '' }, { key: 'productId', value: '' }, { key: 'userId', value: '' }, { key: 'q', value: '' }] }) },
      { name: 'Detail', request: request({ method: 'GET', path: ['admin', 'review', '1'] }) },
      { name: 'Approve / hide', request: request({ method: 'PATCH', path: ['admin', 'review', '1'], body: { isApproved: true } }) },
      { name: 'Delete', request: request({ method: 'DELETE', path: ['admin', 'review', '1'] }) },
    ]),
    folder('Wishlist', [
      { name: 'List (filters: userId, productId)', request: request({ method: 'GET', path: ['admin', 'wishlist'], query: [{ key: 'page', value: '0' }, { key: 'size', value: '10' }, { key: 'userId', value: '' }, { key: 'productId', value: '' }] }) },
    ]),
  ],
);

const dir = __dirname;
const files = [
  ['Jabaib-Orders.postman_collection.json', orders],
  ['Jabaib-Users.postman_collection.json', users],
  ['Jabaib-Locations.postman_collection.json', locations],
  ['Jabaib-Moderation.postman_collection.json', moderation],
];
for (const [file, data] of files) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2));
  console.log(`Wrote ${file}`);
}