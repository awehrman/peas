"use client";
import { createContext, useContext, useRef, useState } from "react";
import { navigationItems as items } from "@/config/navigation";
const NavigationContext = createContext(undefined);
export function NavigationProvider({ children }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const sidebarRef = useRef(null);
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
        items,
        isExpanded,
        setIsExpanded,
        sidebarRef,
        isTopNavOpen,
        setIsTopNavOpen,
        isHovering,
        setIsHovering,
        // handleMouseMove,
    };
    return (<NavigationContext.Provider value={value}>
      <div data-expanded={isExpanded} data-top-nav-open={isTopNavOpen}>
        {children}
      </div>
    </NavigationContext.Provider>);
}
export function useNavigation() {
    const context = useContext(NavigationContext);
    if (context === undefined) {
        throw new Error("useNavigation must be used within a NavigationProvider");
    }
    return context;
}
