"use client";

import { NavItem } from "./nav-item";

import { useCallback, useMemo } from "react";

import { Toggle, cn } from "@peas/components";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@peas/components";
import { LogOut, LucideIcon, MoreVertical } from "lucide-react";

import { NAVIGATION_CONSTANTS } from "../config";
import {
  NavigationProvider,
  useNavigation,
} from "../contexts/NavigationContext";

// Pure UI interface - no business logic
export interface PureMobileNavigationProps {
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
}

function MobileSidebarNavigation({
  navigationItems,
  LinkComponent,
  pathname,
  signOut,
}: PureMobileNavigationProps) {
  const { isExpanded, setIsExpanded } = useNavigation();

  // Memoize the toggle button positioning for mobile layout
  const toggleButtonStyle = useMemo(
    () => ({
      position: "absolute" as const,
      right: `${10 + NAVIGATION_CONSTANTS.TOGGLE_VERTICAL_OFFSET}px`, // 10px from right edge
      top: "8px", // Always at top for mobile
    }),
    []
  );

  // Memoize the sidebar height class for mobile
  const sidebarHeightClass = useMemo(
    () =>
      isExpanded
        ? NAVIGATION_CONSTANTS.MOBILE_EXPANDED_HEIGHT
        : NAVIGATION_CONSTANTS.MOBILE_COLLAPSED_HEIGHT,
    [isExpanded]
  );

  // Memoize the toggle button aria-label
  const toggleAriaLabel = useMemo(
    () => (isExpanded ? "Collapse navigation" : "Expand navigation"),
    [isExpanded]
  );

  // Memoize the sign out form submission handler
  const handleSignOutSubmit = useCallback(() => {
    setIsExpanded(false);
  }, [setIsExpanded]);

  // Memoize the toggle button change handler
  const handleToggleChange = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded, setIsExpanded]);

  // Memoize the navigation items to avoid unnecessary re-renders
  const navigationItemsList = useMemo(
    () =>
      navigationItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <NavigationMenuItem key={item.href} className="w-full">
            <NavItem
              name={item.name}
              href={item.href}
              icon={item.icon}
              LinkComponent={LinkComponent}
              className={cn(
                "flex items-center gap-3 w-full p-3 rounded-md transition-colors font-normal",
                isActive
                  ? "text-primary-500"
                  : "text-navigation-foreground hover:text-primary-500"
              )}
            />
          </NavigationMenuItem>
        );
      }),
    [navigationItems, pathname, LinkComponent]
  );

  return (
    <aside
      className={cn(
        "bg-navigation border-b border-border fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        sidebarHeightClass
      )}
    >
      {/* Custom mouse-positioned toggle button */}
      <div style={toggleButtonStyle}>
        <Toggle
          pressed={isExpanded}
          onPressedChange={handleToggleChange}
          size={NAVIGATION_CONSTANTS.TOGGLE_SIZE}
          variant="default"
          aria-label={toggleAriaLabel}
          className={cn(
            "h-6 w-6 bg-transparent hover:bg-transparent focus:bg-transparent focus-visible:bg-transparent data-[state=on]:bg-transparent",
            NAVIGATION_CONSTANTS.TOGGLE_TRANSITION
          )}
        >
          <MoreVertical className="h-4 w-4 text-primary" />
        </Toggle>
      </div>

      {/* Navigation content */}
      <div className={cn("h-full flex flex-col", isExpanded ? "pt-4" : "")}>
        {isExpanded ? (
          // Expanded state - use NavigationMenu
          <NavigationMenu
            orientation="vertical"
            className="w-full h-full flex flex-col"
          >
            <NavigationMenuList className="flex-col space-y-1 w-full flex-1">
              {navigationItemsList}
              <NavigationMenuItem className="w-full mt-auto">
                <form
                  action={signOut}
                  className="flex gap-2 items-center w-full p-3 rounded-md transition-colors font-normal text-navigation-foreground hover:bg-accent hover:text-primary-500"
                  onSubmit={handleSignOutSubmit}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <button type="submit">Sign Out</button>
                </form>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        ) : (
          // Collapsed state - only show the toggle button
          <div className="h-full flex items-center justify-center">
            {/* Empty collapsed state - toggle button handles everything */}
          </div>
        )}
      </div>
    </aside>
  );
}

export function MobileNavigation(props: PureMobileNavigationProps) {
  return (
    <NavigationProvider>
      <MobileSidebarNavigation {...props} />
    </NavigationProvider>
  );
}
