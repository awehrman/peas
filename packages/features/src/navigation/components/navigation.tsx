"use client";

import { NavItem } from "./nav-item";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
export interface PureNavigationProps {
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

function SidebarNavigation({
  navigationItems,
  LinkComponent,
  pathname,
  signOut,
}: PureNavigationProps) {
  const { isExpanded, setIsExpanded } = useNavigation();
  const [mouseY, setMouseY] = useState<number>(
    NAVIGATION_CONSTANTS.DEFAULT_MOUSE_Y
  );
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Memoize the toggle button positioning to avoid unnecessary recalculations
  const toggleButtonStyle = useMemo(
    () => ({
      position: "absolute" as const,
      top: `${mouseY - NAVIGATION_CONSTANTS.TOGGLE_VERTICAL_OFFSET}px`,
      left: isExpanded ? "auto" : NAVIGATION_CONSTANTS.COLLAPSED_LEFT_POSITION,
      right: isExpanded ? NAVIGATION_CONSTANTS.EXPANDED_RIGHT_POSITION : "auto",
      transition: isResetting ? NAVIGATION_CONSTANTS.RESET_TRANSITION : "none",
    }),
    [mouseY, isExpanded, isResetting]
  );

  // Memoize the sidebar width class to avoid unnecessary recalculations
  const sidebarWidthClass = useMemo(
    () =>
      isExpanded
        ? NAVIGATION_CONSTANTS.EXPANDED_WIDTH
        : NAVIGATION_CONSTANTS.COLLAPSED_WIDTH,
    [isExpanded]
  );

  // Memoize the toggle button aria-label to avoid unnecessary recalculations
  const toggleAriaLabel = useMemo(
    () => (isExpanded ? "Collapse sidebar" : "Expand sidebar"),
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

  // Memoize the mouse enter/leave handlers
  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => setIsHovering(false), []);

  // Optimized mouse move handler with useCallback
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;

      // Constrain to reasonable bounds
      const constrainedY = Math.max(
        NAVIGATION_CONSTANTS.MOUSE_BOUNDARY,
        Math.min(relativeY, rect.height - NAVIGATION_CONSTANTS.MOUSE_BOUNDARY)
      );

      setMouseY(constrainedY);

      // Clear existing timer
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }

      // Set new timer to reset position (only if not already at default and not hovering)
      resetTimerRef.current = setTimeout(() => {
        if (mouseY !== NAVIGATION_CONSTANTS.DEFAULT_MOUSE_Y && !isHovering) {
          setIsResetting(true);
          setMouseY(NAVIGATION_CONSTANTS.DEFAULT_MOUSE_Y);

          // Clear the reset flag after animation completes
          setTimeout(() => {
            setIsResetting(false);
          }, NAVIGATION_CONSTANTS.ANIMATION_DURATION);
        }
      }, NAVIGATION_CONSTANTS.AUTO_RESET_DELAY);
    },
    [mouseY, isHovering]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

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
                "flex items-center gap-3 w-full p-3 rounded-md transition-colors",
                isActive
                  ? "bg-transparent text-primary"
                  : "hover:bg-transparent text-muted-foreground hover:text-primary"
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
        "bg-card border-r border-border relative group h-screen",
        NAVIGATION_CONSTANTS.SIDEBAR_TRANSITION,
        sidebarWidthClass
      )}
      onMouseMove={handleMouseMove}
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
            "absolute z-50 h-6 w-6 bg-transparent hover:bg-transparent focus:bg-transparent focus-visible:bg-transparent data-[state=on]:bg-transparent",
            NAVIGATION_CONSTANTS.TOGGLE_TRANSITION
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <MoreVertical className="h-4 w-4 text-primary" />
        </Toggle>
      </div>

      {/* Navigation content */}
      <div
        className={cn(
          NAVIGATION_CONSTANTS.SIDEBAR_PADDING,
          NAVIGATION_CONSTANTS.TOP_PADDING
        )}
      >
        {isExpanded ? (
          // Expanded state - use NavigationMenu
          <NavigationMenu orientation="vertical" className="w-full">
            <NavigationMenuList className="flex-col space-y-2 w-full">
              {navigationItemsList}
              <NavigationMenuItem className="w-full">
                <form
                  action={signOut}
                  className="flex gap-2 items-center w-full p-3 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                  onSubmit={handleSignOutSubmit}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <button type="submit">Sign Out</button>
                </form>
              </NavigationMenuItem>
            </NavigationMenuList>
            {/* Bottom padding to prevent toggle button wrapping */}
            <div className={NAVIGATION_CONSTANTS.BOTTOM_SPACING}></div>
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

export function Navigation(props: PureNavigationProps) {
  return (
    <NavigationProvider>
      <SidebarNavigation {...props} />
    </NavigationProvider>
  );
}
