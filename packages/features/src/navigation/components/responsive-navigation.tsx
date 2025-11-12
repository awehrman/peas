"use client";

import { MobileNavigation } from "./mobile-navigation";
import { SidebarNavigation } from "./sidebar-navigation";

import { NAVIGATION_CONSTANTS } from "../config/constants";
import { useScreenSize } from "../hooks";
import { ResponsiveNavigationProps } from "../types/navigation";

export function ResponsiveNavigation({
  breakpoint = NAVIGATION_CONSTANTS.MOBILE_BREAKPOINT,
  ...props
}: ResponsiveNavigationProps) {
  const { isMobile, isMounted } = useScreenSize({ breakpoint });

  if (!isMounted) {
    return <SidebarNavigation {...props} />;
  }

  return isMobile ? (
    <MobileNavigation {...props} />
  ) : (
    <SidebarNavigation {...props} />
  );
}
