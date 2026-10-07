import { ProductDetailContent } from './ProductDetailContent';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductDetailContent key={slug} slug={decodeURIComponent(slug)} />;
}