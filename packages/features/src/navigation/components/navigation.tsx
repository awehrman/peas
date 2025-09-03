"use client";

import { NavItem } from "./nav-item";

import { useState } from "react";

import { Toggle } from "@peas/components";
import { cn } from "@peas/components";
import { LogOut, LucideIcon, MoreVertical } from "lucide-react";

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
  const [mouseY, setMouseY] = useState(16); // Default to top-4 (16px)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    // Constrain to reasonable bounds (16px from top to bottom)
    const constrainedY = Math.max(16, Math.min(relativeY, rect.height - 40));
    setMouseY(constrainedY);
  };

  return (
    <aside
      className={cn(
        "bg-card border-r border-border transition-all duration-300 relative group h-screen",
        isExpanded ? "w-64" : "w-16"
      )}
      onMouseMove={handleMouseMove}
    >
      {/* Toggle button */}
      <div
        style={{
          position: "absolute",
          top: `${mouseY - 18}px`, // Center vertically (half of h-9 = 18px)
          left: isExpanded ? "auto" : "50%",
          right: isExpanded ? "8px" : "auto",
          transform: isExpanded ? "none" : "translateX(-50%)",
        }}
      >
        <Toggle
          pressed={isExpanded}
          onPressedChange={() => setIsExpanded(!isExpanded)}
          size="default"
          variant="default"
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          className="h-9 w-9 bg-transparent hover:bg-transparent focus:bg-transparent focus-visible:bg-transparent data-[state=on]:bg-transparent transition-all duration-300 group/toggle"
        >
          <MoreVertical className="h-6 w-6 text-primary transition-all duration-300 group-hover/toggle:h-7 group-hover/toggle:w-7" />
        </Toggle>
      </div>

      {/* Navigation items - hidden when collapsed */}
      <nav
        className={cn(
          "p-4 space-y-2 pt-12 transition-all duration-300",
          isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <div key={item.href} className="relative group/item">
              <NavItem
                name={item.name}
                href={item.href}
                icon={item.icon}
                LinkComponent={LinkComponent}
                className={cn(
                  "flex items-center gap-3 w-full p-3 rounded-md transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              />
            </div>
          );
        })}
        <form
          action={signOut}
          className="flex gap-2 items-center w-full p-3 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          onSubmit={() => setIsExpanded(false)}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <button type="submit">Sign Out</button>
        </form>
      </nav>
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
