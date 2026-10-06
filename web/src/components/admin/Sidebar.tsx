'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Image as ImageIcon,
  TicketPercent,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSidebar } from './SidebarContext';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path?: string;
  id: string;
  submenu?: { label: string; path: string; id: string }[];
}

const NAV: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard', id: 'dashboard' },
  {
    icon: Package,
    label: 'Catalog',
    id: 'catalog',
    submenu: [
      { label: 'Category', path: '/admin/categories', id: 'category' },
      { label: 'Attribute', path: '/admin/attributes', id: 'attribute' },
      { label: 'Product', path: '/admin/products', id: 'product' },
      { label: 'Label', path: '/admin/labels', id: 'label' },
    ],
  },
  {
    icon: ShoppingCart,
    label: 'Orders',
    id: 'orders',
    submenu: [{ label: 'Order List', path: '/admin/orders', id: 'order-list' }],
  },
  {
    icon: Users,
    label: 'Customers',
    id: 'customers',
    submenu: [{ label: 'Customer List', path: '/admin/customers', id: 'customer-list' }],
  },
  { icon: TicketPercent, label: 'Coupons', path: '/admin/coupons', id: 'coupons' },
  { icon: ImageIcon, label: 'Banners', path: '/admin/banners', id: 'banners' },
  { icon: Settings, label: 'Settings', path: '/admin/settings', id: 'settings' },
];

export function AdminSidebar() {
  const { isExpanded, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (id: string) =>
    setOpenMenus((m) => ({ ...m, [id]: !m[id] }));

  const isActive = (path?: string) => path && pathname.startsWith(path);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } w-56 md:translate-x-0 ${isExpanded ? 'md:w-56' : 'md:w-20'}`}
      >
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {isExpanded && (
          <Link href="/admin/dashboard" className="text-lg font-extrabold text-primary">
            Jabaib
          </Link>
        )}
        <button
          onClick={toggle}
          className="rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {isExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <nav className="flex flex-col gap-1 overflow-y-auto p-3">
        {NAV.map((item) => {
          const open = openMenus[item.id];
          const active =
            isActive(item.path) ||
            item.submenu?.some((s) => isActive(s.path));
          return (
            <div key={item.id}>
              {item.submenu ? (
                <button
                  onClick={() => toggleMenu(item.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                  }`}
                >
                  <item.icon size={18} className="shrink-0" />
                  {isExpanded && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href={item.path!}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                  }`}
                >
                  <item.icon size={18} className="shrink-0" />
                  {isExpanded && <span>{item.label}</span>}
                </Link>
              )}

              {open && isExpanded && item.submenu && (
                <div className="ml-6 mt-1 flex flex-col gap-1 border-l border-sidebar-border pl-3">
                  {item.submenu.map((sub) => (
                    <Link
                      key={sub.id}
                      href={sub.path}
                      className={`rounded-md px-2 py-1.5 text-sm ${
                        isActive(sub.path)
                          ? 'font-semibold text-primary'
                          : 'text-sidebar-foreground/80 hover:text-primary'
                      }`}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      </aside>
    </>
  );
}
