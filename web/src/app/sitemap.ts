import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';
import { storefront } from '@/lib/storefront';

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
  { url: `${SITE_URL}/shop`, changeFrequency: 'hourly', priority: 0.9 },
  { url: `${SITE_URL}/categories`, changeFrequency: 'daily', priority: 0.7 },
];

async function allPublishedProducts() {
  const urls: MetadataRoute.Sitemap = [];
  let page = 0;
  for (;;) {
    const { data, pagination } = await storefront.products({ page, size: 100 });
    for (const product of data) {
      urls.push({
        url: `${SITE_URL}/product/${product.slug}`,
        changeFrequency: 'weekly',
        priority: product.isFeatured ? 0.8 : 0.6,
      });
    }
    if (!pagination.hasNext) break;
    page += 1;
  }
  return urls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    storefront.categories(),
    allPublishedProducts(),
  ]);

  const categoryUrls: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/shop?categoryId=${c.id}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...STATIC_ROUTES, ...categoryUrls, ...products];
}
