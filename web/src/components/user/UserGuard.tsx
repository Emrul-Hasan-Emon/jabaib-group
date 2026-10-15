'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserAuth } from '@/lib/user-auth';

export function UserGuard({ children }: { children: React.ReactNode }) {
  const { status } = useUserAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'guest') router.replace('/user/login');
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
