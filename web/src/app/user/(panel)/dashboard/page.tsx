'use client';

import { useUserAuth } from '@/lib/user-auth';

export default function UserDashboardPage() {
  const { user } = useUserAuth();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Hello, {user?.name}</h1>
      <p className="text-sm text-gray-500">
        Your account dashboard — orders, addresses, wishlist and reviews land
        here in later phases.
      </p>
    </div>
  );
}
