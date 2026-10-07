#!/usr/bin/env node
/**
 * Generates the feature-wise File collection. Every file-enabled feature owns
 * its upload/replace/remove through its own admin controller — there is no
 * generic /file/upload anymore. This collection mirrors that architecture:
 * one folder per feature, each with its Upload + Remove requests.
 *
 * Run: node postman/generate-files.js
 * Then: node postman/audit-postman.js
 */
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';

function uploadRequest(featurePath) {
  return {
    method: 'POST',
    header: [
      { key: 'Content-Type', value: 'multipart/form-data; boundary=<computed>' },
      { key: 'Authorization', value: 'Bearer {{adminAccessToken}}' },
    ],
    url: {
      raw: `${BASE}${featurePath}`,
      host: [BASE].concat('v1'),
      path: featurePath.split('/').filter(Boolean),
    },
    body: {
      mode: 'formdata',
      formdata: [{ key: 'file', type: 'file', src: [] }],
    },
  };
}

function removeRequest(featurePath, query) {
  const raw = query
    ? `${BASE}${featurePath}?${query.map((q) => `${q.key}=${q.value}`).join('&')}`
    : `${BASE}${featurePath}`;
  return {
    method: 'DELETE',
    header: [{ key: 'Authorization', value: 'Bearer {{adminAccessToken}}' }],
    url: {
      raw,
      host: [BASE].concat('v1'),
      path: featurePath.split('/').filter(Boolean),
      query: query
        ? query.map((q) => ({ key: q.key, value: q.value }))
        : undefined,
    },
  };
}

function jsonRequest(method, featurePath, raw) {
  return {
    method,
    header: [
      { key: 'Content-Type', value: 'application/json' },
      { key: 'Authorization', value: 'Bearer {{adminAccessToken}}' },
    ],
    url: {
      raw: `${BASE}${featurePath}`,
      host: [BASE].concat('v1'),
      path: featurePath.split('/').filter(Boolean),
    },
    body: { mode: 'raw', raw },
  };
}

function folder(name, items) {
  return { name, item: items };
}

const collections = {
  Category: [
    { name: 'Upload image (then set imageUrl/imagePath)', request: uploadRequest('/v1/admin/category/upload-image') },
    { name: 'Remove image (deletes file + clears fields)', request: removeRequest('/v1/admin/category/1/image') },
  ],
  Product: [
    { name: 'Upload thumbnail (then set thumbnailUrl/thumbnailPath)', request: uploadRequest('/v1/admin/product/upload-image') },
    { name: 'Upload one media item (then POST /:id/media)', request: uploadRequest('/v1/admin/product/media/upload-image') },
    { name: 'Upload many media items at once (then POST /:id/media per file)', request: uploadRequest('/v1/admin/product/media/upload-many') },
    { name: 'Reorder media gallery (order = full list of media ids)', request: jsonRequest('PUT', '/v1/admin/product/1/media/reorder', '{\n  "order": [3, 1, 2]\n}') },
    { name: 'Remove thumbnail (deletes file + clears fields)', request: removeRequest('/v1/admin/product/1/image') },
  ],
  SKU: [
    { name: 'Upload image (then set imageUrl/imagePath via SKU update)', request: uploadRequest('/v1/admin/sku/upload-image') },
    { name: 'Remove image (deletes file + clears fields)', request: removeRequest('/v1/admin/sku/1/image') },
  ],
  Banner: [
    { name: 'Upload image (desktop or mobile)', request: uploadRequest('/v1/admin/banner/upload-image') },
    { name: 'Remove desktop image', request: removeRequest('/v1/admin/banner/1/image', [{ key: 'kind', value: 'desktop' }]) },
    { name: 'Remove mobile image', request: removeRequest('/v1/admin/banner/1/image', [{ key: 'kind', value: 'mobile' }]) },
    { name: 'Remove both images', request: removeRequest('/v1/admin/banner/1/image', [{ key: 'kind', value: 'all' }]) },
  ],
  Homepage: [
    { name: 'Upload image (then embed in content.imageUrl)', request: uploadRequest('/v1/admin/homepage-section/upload-image') },
    { name: 'Remove image (deletes file + clears content.imageUrl)', request: removeRequest('/v1/admin/homepage-section/1/image') },
  ],
  Admin: [
    { name: 'Upload avatar (then set imageUrl/imagePath)', request: uploadRequest('/v1/admin/admin-user/upload-image') },
    { name: 'Remove avatar (deletes file + clears fields)', request: removeRequest('/v1/admin/admin-user/1/image') },
  ],
};

const collection = {
  info: {
    name: 'Jabaib API — File (feature-wise)',
    _postman_id: 'jabaib-file-collection',
    description:
      'Feature-wise file handling: each feature (category, product, sku, banner, homepage, admin) owns its upload + remove endpoints through its own admin controller. Upload first, then store the returned url/path on the entity via its create/update/remove-image API.',
    schema:
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
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
              host: [BASE].concat('v1'),
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
                  "pm.collectionVariables.set('adminAccessToken', res.accessToken);",
                  "pm.collectionVariables.set('adminRefreshToken', res.refreshToken);",
                ],
              },
            },
          ],
        },
      ],
    },
    ...Object.entries(collections).map(([name, items]) => folder(name, items)),
  ],
};

fs.writeFileSync(
  path.join(__dirname, 'Jabaib-File.postman_collection.json'),
  JSON.stringify(collection, null, 2),
);
console.log('Wrote Jabaib-File.postman_collection.json (feature-wise)');