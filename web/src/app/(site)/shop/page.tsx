import { ShopContent } from './ShopContent';

type SearchParamsRecord = Record<string, string | string[] | undefined>;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) =>
    typeof v === 'string' ? v : Array.isArray(v) ? v[0] : '';

  return (
    <ShopContent
      initialQuery={{
        q: str(sp.q),
        categoryId: str(sp.categoryId) ? Number(str(sp.categoryId)) : undefined,
        collectionId: str(sp.collectionId)
          ? Number(str(sp.collectionId))
          : undefined,
        isFeatured: str(sp.isFeatured) === 'true',
        sort:
          (str(sp.sort) as 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'name-asc') ??
          'newest',
      }}
    />
  );
}