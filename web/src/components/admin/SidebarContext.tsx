'use client';

import { createContext, useContext, useState } from 'react';

interface SidebarCtx {
  isExpanded: boolean;
  toggle: () => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const Ctx = createContext<SidebarCtx>({
  isExpanded: true,
  toggle: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <Ctx.Provider
      value={{
        isExpanded,
        toggle: () => setIsExpanded((v) => !v),
        mobileOpen,
        setMobileOpen,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSidebar() {
  return useContext(Ctx);
}
