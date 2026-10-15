'use client';

import { Bell, LogOut, Menu, Search } from 'lucide-react';
import { useAdminAuth } from '@/lib/admin-auth';
import { useSidebar } from './SidebarContext';
import { LangToggle } from '@/components/common/LangToggle';

export function AdminTopbar() {
  const { admin, logout } = useAdminAuth();
  const { isExpanded, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <nav
      className={`fixed right-0 top-0 z-30 h-16 bg-white shadow-sm transition-all duration-300 print:hidden ${
        isExpanded ? 'md:left-56' : 'md:left-20'
      } left-0`}
    >
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-md p-2 text-gray-600 hover:bg-muted md:hidden"
          aria-label="Toggle menu"
        >
          <Menu size={18} />
        </button>
        <div className="hidden items-center rounded-lg bg-muted px-3 py-2 md:flex md:w-96">
          <Search size={16} className="text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products, orders…"
            className="ml-2 w-full bg-transparent text-sm outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <LangToggle />
          <button className="relative p-2 text-gray-600 hover:text-gray-900">
            <Bell size={18} />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-badge-red" />
          </button>
          <div className="flex items-center gap-3 border-l border-border pl-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">
                {admin?.name ?? 'Admin'}
              </p>
              <p className="text-xs text-muted-foreground">{admin?.role}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
              {(admin?.name ?? 'A')[0].toUpperCase()}
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
