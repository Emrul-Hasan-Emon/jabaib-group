'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { useLocale } from '@/lib/locale';

export default function UserOrdersPage() {
  const { t } = useLocale();
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Package size={26} className="text-muted-foreground" />
      </div>
      <h1 className="text-xl font-extrabold text-foreground">{t('No orders yet')}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {t(
          'Once you place an order it will show up here with live tracking.',
          'অর্ডার করার পর এখানে লাইভ ট্র্যাকিংসহ দেখা যাবে।',
        )}
      </p>
      <Link
        href="/shop"
        className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        {t('Start shopping')}
      </Link>
    </div>
  );
}