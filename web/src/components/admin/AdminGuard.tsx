'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth';

/** Client-side guard: redirects to login unless an admin session exists. */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'guest') router.replace('/admin/login');
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }
  if (status === 'guest') return null;
  return <>{children}</>;
}
