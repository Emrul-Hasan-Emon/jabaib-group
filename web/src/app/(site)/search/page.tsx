import { Suspense } from 'react';
import { ShopContent } from '../shop/ShopContent';
import { ProductGridSkeleton } from '@/components/storefront/SectionHeader';

export const metadata = { title: 'Search — Jabaib' };

/**
 * Dedicated search results page. Reuses the shop browser with a `q` seed so
 * every shop filter (category, attribute, sort, pagination) keeps working on
 * search results; URL updates stay on /search.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? '').trim();

  return (
    <div className="bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:py-5">
          <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
            {query ? (
              <>
                Results for{' '}
                <span className="text-primary">“{query}”</span>
              </>
            ) : (
              'Search Jabaib'
            )}
          </h1>
        </div>
      </div>
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
            <ProductGridSkeleton count={8} />
          </div>
        }
      >
        <ShopContent key={query} initialQuery={{ q: query }} basePath="/search" />
      </Suspense>
    </div>
  );
}