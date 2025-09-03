"use client";

import { MobileNavigation } from "./mobile-navigation";
import { Navigation } from "./navigation";

import { LucideIcon } from "lucide-react";

import { NAVIGATION_CONSTANTS } from "../config";
import { useScreenSize } from "../hooks";

// Pure UI interface - no business logic
export interface PureResponsiveNavigationProps {
  navigationItems: Array<{
    name: string;
    href: string;
    icon: LucideIcon;
  }>;
  LinkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
    onClick?: () => void;
  }>;
  pathname?: string;
  signOut: () => Promise<void>;
  breakpoint?: number; // Screen width breakpoint for mobile/desktop switch
}

export function ResponsiveNavigation({
  breakpoint = NAVIGATION_CONSTANTS.MOBILE_BREAKPOINT, // Default to theme breakpoint (768px)
  ...props
}: PureResponsiveNavigationProps) {
  const { isMobile, isMounted } = useScreenSize({ breakpoint });

  // During SSR or before hydration, render desktop navigation as fallback
  // This prevents hydration mismatches
  if (!isMounted) {
    return <Navigation {...props} />;
  }

  // After hydration, render appropriate navigation based on screen size
  return isMobile ? <MobileNavigation {...props} /> : <Navigation {...props} />;
}
