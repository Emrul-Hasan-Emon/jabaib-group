import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/config';
import { mediaUrl } from '@/lib/media-url';
import { storefront } from '@/lib/storefront';
import { ProductDetailContent } from './ProductDetailContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await storefront
    .productBySlug(decodeURIComponent(slug))
    .catch(() => null);
  if (!product) return { title: 'Product not found' };

  const description =
    product.description?.slice(0, 160) ??
    `Buy ${product.name} on Jabaib — bilingual (EN/BN) product details, sizes and fast delivery across Bangladesh.`;
  const image = product.media.find((m) => m.isPrimary) ?? product.media[0];

  return {
    title: product.name,
    description,
    alternates: { canonical: `${SITE_URL}/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      url: `${SITE_URL}/product/${product.slug}`,
      images: image ? [{ url: mediaUrl(image.url) }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductDetailContent key={slug} slug={decodeURIComponent(slug)} />;
}