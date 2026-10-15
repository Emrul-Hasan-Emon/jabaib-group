'use client';

import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminSidebar } from '@/components/admin/Sidebar';
import { AdminTopbar } from '@/components/admin/Topbar';
import { SidebarProvider, useSidebar } from '@/components/admin/SidebarContext';

function Shell({ children }: { children: React.ReactNode }) {
  const { isExpanded } = useSidebar();
  return (
    <div className="bg-gray-50">
      <AdminSidebar />
      <AdminTopbar />
      <main
        className={`mt-16 min-h-[calc(100vh-64px)] transition-all duration-300 ${
          isExpanded ? 'md:ml-56' : 'md:ml-20'
        }`}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <SidebarProvider>
        <Shell>{children}</Shell>
      </SidebarProvider>
    </AdminGuard>
  );
}
