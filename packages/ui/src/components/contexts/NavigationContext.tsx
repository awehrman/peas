"use client";

import { createContext, useContext, useRef, useState, ReactNode } from "react";

interface NavigationContextType {
  // Sidebar state
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
  sidebarRef: React.RefObject<HTMLDivElement | null>;

  // Top nav state
  isTopNavOpen: boolean;
  setIsTopNavOpen: (value: boolean) => void;

  // Mouse interaction state
  isHovering: boolean;
  setIsHovering: (value: boolean) => void;

  // Handlers
  // handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isTopNavOpen, setIsTopNavOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
  //   if (!sidebarRef.current) return;

  //   const sidebarRect = sidebarRef.current.getBoundingClientRect();
  //   const relativeY = e.clientY - sidebarRect.top;
  //   const percentY = (relativeY / sidebarRect.height) * 100;

  //   const constrainedY = Math.min(Math.max(percentY, 5), 95);
  //   setButtonPosition(constrainedY);
  // };

  const value = {
    isExpanded,
    setIsExpanded,
    sidebarRef,
    isTopNavOpen,
    setIsTopNavOpen,
    isHovering,
    setIsHovering,
    // handleMouseMove,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
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
