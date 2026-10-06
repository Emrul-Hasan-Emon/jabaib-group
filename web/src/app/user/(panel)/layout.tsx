'use client';

import { UserGuard } from '@/components/user/UserGuard';
import { useUserAuth } from '@/lib/user-auth';
import { LangToggle } from '@/components/common/LangToggle';
import { LogOut } from 'lucide-react';

export default function UserPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useUserAuth();
  return (
    <UserGuard>
      <div className="flex min-h-screen flex-col bg-muted/40">
        <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
          <a href="/" className="text-lg font-extrabold text-primary">
            Jabaib
          </a>
          <div className="flex items-center gap-4">
            <LangToggle />
            <span className="hidden text-sm font-medium text-foreground sm:block">
              {user?.name}
            </span>
            <button
              onClick={logout}
              title="Logout"
              className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </UserGuard>
  );
}
