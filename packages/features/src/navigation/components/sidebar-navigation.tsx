"use client";

import { NavigationItemsList } from "./navigation-items-list";
import { NavigationToggle } from "./navigation-toggle";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { NavigationMenu, NavigationMenuList, cn } from "@peas/components";
import { LogOut } from "lucide-react";

import { NAVIGATION_CONSTANTS } from "../config/constants";
import {
  NavigationProvider,
  useNavigation,
} from "../contexts/NavigationContext";
import { PureNavigationProps } from "../types/navigation";

function SidebarNavigationComponent({
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

  const sidebarWidthClass = isExpanded
    ? NAVIGATION_CONSTANTS.EXPANDED_WIDTH
    : NAVIGATION_CONSTANTS.COLLAPSED_WIDTH;

  const toggleAriaLabel = isExpanded ? "Collapse sidebar" : "Expand sidebar";

  const handleSignOutSubmit = useCallback(() => {
    setIsExpanded(false);
  }, [setIsExpanded]);

  const handleToggleChange = useCallback(() => {
    setIsExpanded((current) => !current);
  }, [setIsExpanded]);

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => setIsHovering(false), []);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const relativeY = event.clientY - rect.top;
      const constrainedY = Math.max(
        NAVIGATION_CONSTANTS.MOUSE_BOUNDARY,
        Math.min(relativeY, rect.height - NAVIGATION_CONSTANTS.MOUSE_BOUNDARY)
      );

      setMouseY(constrainedY);

      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }

      resetTimerRef.current = setTimeout(() => {
        if (mouseY !== NAVIGATION_CONSTANTS.DEFAULT_MOUSE_Y && !isHovering) {
          setIsResetting(true);
          setMouseY(NAVIGATION_CONSTANTS.DEFAULT_MOUSE_Y);

          setTimeout(() => {
            setIsResetting(false);
          }, NAVIGATION_CONSTANTS.ANIMATION_DURATION);
        }
      }, NAVIGATION_CONSTANTS.AUTO_RESET_DELAY);
    },
    [mouseY, isHovering]
  );

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  return (
    <aside
      className={cn(
        "bg-navigation border-r border-border relative group h-screen min-h-screen",
        NAVIGATION_CONSTANTS.SIDEBAR_TRANSITION,
        sidebarWidthClass
      )}
      onMouseMove={handleMouseMove}
    >
      <NavigationToggle
        ariaLabel={toggleAriaLabel}
        isExpanded={isExpanded}
        onToggleChange={handleToggleChange}
        onHoverStart={handleMouseEnter}
        onHoverEnd={handleMouseLeave}
        style={toggleButtonStyle}
      />

      <div
        className={cn(
          NAVIGATION_CONSTANTS.SIDEBAR_PADDING,
          NAVIGATION_CONSTANTS.TOP_PADDING,
          "h-full min-h-full flex flex-col"
        )}
      >
        {isExpanded ? (
          <>
            <div className="flex-none">
              <NavigationMenu orientation="vertical" className="w-full">
                <NavigationMenuList className="flex-col space-y-2 w-full">
                  <NavigationItemsList
                    navigationItems={navigationItems}
                    LinkComponent={LinkComponent}
                    pathname={pathname}
                  />
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            <div className="mt-auto pb-4">
              <div className="w-full list-none">
                <form
                  action={signOut}
                  className="flex gap-3 items-center w-full p-3 rounded-md transition-colors font-normal text-navigation-foreground hover:!text-primary-500"
                  onSubmit={handleSignOutSubmit}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <button type="submit">Sign Out</button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center" />
        )}
      </div>
    </aside>
  );
}

export function SidebarNavigation(props: PureNavigationProps) {
  return (
    <NavigationProvider>
      <SidebarNavigationComponent {...props} />
    </NavigationProvider>
  );
}
