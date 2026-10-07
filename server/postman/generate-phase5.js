#!/usr/bin/env node
/**
 * Generates Phase 5 Postman collections (Customers / Marketing / Settings /
 * Admin Users) for the Jabaib admin API. Run: node postman/generate-phase5.js
 * The JSON files are committed so they can be imported directly.
 */
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';

function authHeaders() {
  return [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Authorization', value: 'Bearer {{adminAccessToken}}' },
  ];
}

function request({ method, path: pathArr, body, query }) {
  const url = {
    raw: `${BASE}/v1/${pathArr.join('/')}${query ? '' : ''}`,
    host: [BASE],
    path: ['v1', ...pathArr],
  };
  if (query && query.length) {
    url.raw = `${BASE}/v1/${pathArr.join('/')}?${query
      .map((q) => `${q.key}=${q.value}`)
      .join('&')}`;
    url.query = query.map((q) => ({ key: q.key, value: q.value }));
  }
  const item = { method, header: authHeaders(), url };
  if (body) {
    item.body = { mode: 'raw', raw: JSON.stringify(body, null, 2) };
  }
  return item;
}

function crudFolder(name, basePath) {
  return {
    name,
    item: [
      { name: 'List', request: request({ method: 'GET', path: basePath, query: [{ key: 'page', value: '0' }, { key: 'size', value: '10' }] }) },
      { name: 'Detail', request: request({ method: 'GET', path: [...basePath, ':id'] }) },
      { name: 'Create', request: request({ method: 'POST', path: basePath, body: {} }) },
      { name: 'Update', request: request({ method: 'PATCH', path: [...basePath, ':id'], body: {} }) },
      { name: 'Delete', request: request({ method: 'DELETE', path: [...basePath, ':id'] }) },
    ],
  };
}

function folder(name, items) {
  return { name, item: items };
}

function collection(name, id, description, items) {
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
    ],
    item: [
      {
        name: 'Auth',
        item: [
          {
            name: 'Admin login (sets token)',
            request: {
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              url: {
                raw: `${BASE}/v1/admin/auth/login`,
                host: [BASE],
                path: ['v1', 'admin', 'auth', 'login'],
              },
              body: {
                mode: 'raw',
                raw: '{\n  "email": "admin@jabaib.com",\n  "password": "Admin@12345"\n}',
              },
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'const res = pm.response.json();',
                    'pm.collectionVariables.set(\'adminAccessToken\', res.accessToken);',
                    'pm.collectionVariables.set(\'adminRefreshToken\', res.refreshToken);',
                  ],
                },
              },
            ],
          },
        ],
      },
      ...items,
    ],
  };
}

const customers = collection(
  'Customer Management',
  'jabaib-phase5-customers',
  'Phase 5 — Customers. Customer list with order & wishlist counts, and per-customer detail (orders, addresses, wishlist, auth providers).',
  [
    folder('Customers', [
      {
        name: 'List',
        request: request({
          method: 'GET',
          path: ['admin', 'customer'],
          query: [
            { key: 'page', value: '0' },
            { key: 'size', value: '10' },
            { key: 'q', value: '' },
            { key: 'isActive', value: '' },
          ],
        }),
      },
      {
        name: 'Detail',
        request: request({ method: 'GET', path: ['admin', 'customer', '1'] }),
      },
    ]),
  ],
);

const marketing = collection(
  'Marketing — Coupons, Banners, Homepage Sections',
  'jabaib-phase5-marketing',
  'Phase 5 — Marketing. Coupons CRUD + usage audit, banners, homepage sections.',
  [
    folder('Coupons', [
      {
        name: 'List (filters: code, type, isActive, startDate, endDate — dates filter by eligibility window)',
        request: request({
          method: 'GET',
          path: ['admin', 'coupon'],
          query: [
            { key: 'page', value: '0' },
            { key: 'size', value: '10' },
            { key: 'code', value: '' },
            { key: 'type', value: '' },
            { key: 'isActive', value: '' },
            { key: 'startDate', value: '' },
            { key: 'endDate', value: '' },
          ],
        }),
      },
      { name: 'Detail', request: request({ method: 'GET', path: ['admin', 'coupon', '1'] }) },
      {
        name: 'Create',
        request: request({
          method: 'POST',
          path: ['admin', 'coupon'],
          body: { code: 'SUMMER10', type: 'percent', amount: 10, minOrderAmount: 1500, maxDiscountAmount: 300, usageLimit: 500, perUserLimit: 1, startsAt: null, endsAt: null, isActive: true },
        }),
      },
      {
        name: 'Update (incl. per-user limit & validity)',
        request: request({ method: 'PATCH', path: ['admin', 'coupon', '1'], body: { perUserLimit: 2, endsAt: '2026-12-31T23:59:59.000Z' } }),
      },
      { name: 'Delete', request: request({ method: 'DELETE', path: ['admin', 'coupon', ':id'] }) },
    ]),
    folder('Coupon History', [
      {
        name: 'Usage audit (filters: couponCode, customerName, mobile, orderNumber, startDate, endDate)',
        request: request({
          method: 'GET',
          path: ['admin', 'coupon-history'],
          query: [
            { key: 'page', value: '0' },
            { key: 'size', value: '10' },
            { key: 'couponCode', value: '' },
            { key: 'customerName', value: '' },
            { key: 'mobile', value: '' },
            { key: 'orderNumber', value: '' },
            { key: 'startDate', value: '' },
            { key: 'endDate', value: '' },
          ],
        }),
      },
      {
        name: 'History for one coupon',
        request: request({ method: 'GET', path: ['admin', 'coupon', '1', 'history'] }),
      },
    ]),
    crudFolder('Banners', ['admin', 'banner']),
    crudFolder('Homepage Sections', ['admin', 'homepage-section']),
  ],
);

const settings = collection(
  'Settings — Pages, Shipping, System, Languages',
  'jabaib-phase5-settings',
  'Phase 5 — Settings. Static pages, shipping zones, system key-values, and languages. Locations moved to the separate Jabaib-Locations collection.',
  [
    crudFolder('Page Settings', ['admin', 'page-settings']),
    crudFolder('Shipping Zones', ['admin', 'shipping-zone']),
    folder('System Settings', [
      {
        name: 'Grouped (key-value editor)',
        request: request({ method: 'GET', path: ['admin', 'system-setting', 'grouped'] }),
      },
      { name: 'List', request: request({ method: 'GET', path: ['admin', 'system-setting'], query: [{ key: 'page', value: '0' }, { key: 'size', value: '10' }] }) },
      { name: 'Detail', request: request({ method: 'GET', path: ['admin', 'system-setting', '1'] }) },
      { name: 'Create', request: request({ method: 'POST', path: ['admin', 'system-setting'], body: { key: 'announcement_text', value: 'Free delivery over ৳2000', group: 'general' } }) },
      { name: 'Update', request: request({ method: 'PATCH', path: ['admin', 'system-setting', '1'], body: { value: 'Jabaib' } }) },
      { name: 'Delete', request: request({ method: 'DELETE', path: ['admin', 'system-setting', ':id'] }) },
    ]),
    crudFolder('Languages', ['admin', 'language']),
  ],
);

const adminUsers = collection(
  'Admin Users (super_admin only)',
  'jabaib-phase5-admin-users',
  'Phase 5 — Admin Users. Create/edit/disable admin accounts. Routes require super_admin role.',
  [
    {
      name: 'Admin Users',
      item: [
        {
          name: 'List',
          request: request({ method: 'GET', path: ['admin', 'admin-user'], query: [{ key: 'page', value: '0' }, { key: 'size', value: '10' }] }),
        },
        {
          name: 'Detail',
          request: request({ method: 'GET', path: ['admin', 'admin-user', '1'] }),
        },
        {
          name: 'Create (with profile image)',
          request: request({
            method: 'POST',
            path: ['admin', 'admin-user'],
            body: { name: 'Rahim Admin', email: 'rahim@jabaib.com', password: 'Admin@12345', role: 'admin', isActive: true, imageUrl: '/uploads/admin/rahim.jpg', imagePath: '/uploads/admin/rahim.jpg' },
          }),
        },
        {
          name: 'Update (role / password / active / image)',
          request: request({ method: 'PATCH', path: ['admin', 'admin-user', '2'], body: { role: 'editor', imageUrl: '/uploads/admin/rahim-v2.jpg', imagePath: '/uploads/admin/rahim-v2.jpg' } }),
        },
        {
          name: 'Delete (cannot delete yourself)',
          request: request({ method: 'DELETE', path: ['admin', 'admin-user', ':id'] }),
        },
      ],
    },
  ],
);

const dir = __dirname;
const files = [
  ['Jabaib-Customers.postman_collection.json', customers],
  ['Jabaib-Marketing.postman_collection.json', marketing],
  ['Jabaib-Settings.postman_collection.json', settings],
  ['Jabaib-AdminUsers.postman_collection.json', adminUsers],
];
for (const [file, data] of files) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2));
  console.log(`Wrote ${file}`);
}