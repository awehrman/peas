"use client";

import { NavigationItemsList } from "./navigation-items-list";
import { NavigationToggle } from "./navigation-toggle";
import { UserAvatar } from "./user-avatar";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { NavigationMenu, NavigationMenuList, cn } from "@peas/components";
import { LogOut } from "lucide-react";

import { NAVIGATION_CONSTANTS } from "../config/constants";
import { getToggleRestY } from "../config/navigation";
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
  user,
}: PureNavigationProps) {
  const { isExpanded, setIsExpanded } = useNavigation();
  const isAvatarVisible = isExpanded && !!user;
  const listTop = isAvatarVisible
    ? NAVIGATION_CONSTANTS.NAV_LIST_TOP +
      NAVIGATION_CONSTANTS.AVATAR_BLOCK_HEIGHT
    : NAVIGATION_CONSTANTS.NAV_LIST_TOP;
  const restY = isExpanded
    ? getToggleRestY(navigationItems, pathname, listTop)
    : NAVIGATION_CONSTANTS.HEADER_CENTER_Y;
  const restYRef = useRef(restY);
  restYRef.current = restY;
  const [mouseY, setMouseY] = useState<number>(restY);
  const mouseYRef = useRef(restY);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringRef = useRef(false);
  const [isResetting, setIsResetting] = useState(false);

  const toggleButtonStyle = useMemo(
    () => ({
      position: "absolute" as const,
      top: `${mouseY - NAVIGATION_CONSTANTS.TOGGLE_HALF_HEIGHT}px`,
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

  const handleMouseEnter = useCallback(() => {
    isHoveringRef.current = true;
  }, []);
  const handleMouseLeave = useCallback(() => {
    isHoveringRef.current = false;
  }, []);

  // Glide back to the active page's row once the mouse stops driving it.
  // Reads refs so a pending timer always uses the latest active page.
  const returnToRest = useCallback(() => {
    const target = restYRef.current;
    if (isHoveringRef.current || mouseYRef.current === target) return;

    setIsResetting(true);
    mouseYRef.current = target;
    setMouseY(target);

    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    animationTimerRef.current = setTimeout(() => {
      setIsResetting(false);
    }, NAVIGATION_CONSTANTS.ANIMATION_DURATION);
  }, []);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const relativeY = event.clientY - rect.top;
      const constrainedY = Math.max(
        NAVIGATION_CONSTANTS.MOUSE_BOUNDARY,
        Math.min(relativeY, rect.height - NAVIGATION_CONSTANTS.MOUSE_BOUNDARY)
      );

      setIsResetting(false);
      mouseYRef.current = constrainedY;
      setMouseY(constrainedY);

      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = setTimeout(() => {
        resetTimerRef.current = null;
        returnToRest();
      }, NAVIGATION_CONSTANTS.AUTO_RESET_DELAY);
    },
    [returnToRest]
  );

  // A new active page while the mouse is elsewhere (a pending timer handles
  // navigation started from the sidebar itself)
  useEffect(() => {
    if (!resetTimerRef.current) returnToRest();
  }, [restY, returnToRest]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
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
            {isAvatarVisible && (
              <div
                className={cn(
                  "flex-none flex flex-col items-center gap-2 px-5",
                  NAVIGATION_CONSTANTS.AVATAR_MARGIN
                )}
              >
                <UserAvatar
                  user={user}
                  className={NAVIGATION_CONSTANTS.AVATAR_SIZE}
                />
                <span className="max-w-full truncate text-sm font-medium text-navigation-foreground">
                  {user.username}
                </span>
              </div>
            )}

            <div className="flex-none">
              <NavigationMenu
                orientation="vertical"
                className="w-full max-w-none flex-col items-stretch justify-start"
              >
                <NavigationMenuList className="flex-col space-x-0 w-full">
                  <NavigationItemsList
                    navigationItems={navigationItems}
                    LinkComponent={LinkComponent}
                    pathname={pathname}
                  />
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            <div className="mt-auto">
              <div className="w-full list-none">
                <form
                  action={signOut}
                  className="flex gap-3 items-center w-full px-5 py-1.5 text-sm font-medium transition-colors text-navigation-foreground hover:!text-primary-300 hover:bg-white/5"
                  onSubmit={handleSignOutSubmit}
                >
                  <LogOut className="h-4 w-4" />
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
