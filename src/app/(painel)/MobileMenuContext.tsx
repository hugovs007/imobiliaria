"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface MobileMenuContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const MobileMenuContext = createContext<MobileMenuContextType | undefined>(undefined);

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((current) => !current), []);
  const value = useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);

  useEffect(() => {
    if (!isOpen) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", fecharComEscape);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", fecharComEscape);
    };
  }, [isOpen]);

  return (
    <MobileMenuContext.Provider value={value}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  const context = useContext(MobileMenuContext);
  if (!context) {
    throw new Error("useMobileMenu must be used within a MobileMenuProvider");
  }
  return context;
}