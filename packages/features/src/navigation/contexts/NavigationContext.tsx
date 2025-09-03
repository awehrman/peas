"use client";

import { ReactNode, createContext, useContext, useRef, useState } from "react";

interface NavigationContextType {
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
  sidebarRef: React.RefObject<HTMLDivElement | null>;

  isTopNavOpen: boolean;
  setIsTopNavOpen: (value: boolean) => void;

  isHovering: boolean;
  setIsHovering: (value: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isTopNavOpen, setIsTopNavOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const value = {
    isExpanded,
    setIsExpanded,
    sidebarRef,
    isTopNavOpen,
    setIsTopNavOpen,
    isHovering,
    setIsHovering,
  };
  return (
    <NavigationContext.Provider value={value}>
      <div data-expanded={isExpanded} data-top-nav-open={isTopNavOpen}>
        {children}
      </div>
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
