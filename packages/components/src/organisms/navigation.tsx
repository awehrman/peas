"use client";

import { MoreVertical, LogOut } from "lucide-react";
import { useState } from "react";
import {
  NavigationProvider,
  useNavigation,
} from "../contexts/NavigationContext";
import { NavigationProps } from "../types/navigation";
import { NavItem } from "../molecules/navigation/nav-item";
import { Button } from "../ui/button";
import { cn } from "../lib/utils";

function SidebarNavigation({
  LinkComponent,
  pathname,
  signOut,
}: NavigationProps) {
  const { items, isExpanded, setIsExpanded } = useNavigation();
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
      <Button
        variant="ghost"
        size="icon"
        className="absolute z-50 h-6 w-6 bg-transparent hover:bg-transparent transition-all duration-150"
        style={{
          top: `${mouseY}px`,
          left: isExpanded ? "auto" : "50%",
          right: isExpanded ? "0" : "auto",
          transform: isExpanded ? "none" : "translateX(-50%)",
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <MoreVertical className="h-4 w-4 text-primary" />
      </Button>

      {/* Navigation items - hidden when collapsed */}
      <nav
        className={cn(
          "p-4 space-y-2 pt-12 transition-all duration-300",
          isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {items.map((item) => {
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
          className="flex items-center gap-3 w-full p-3 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          onSubmit={() => setIsExpanded(false)}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <button type="submit">Sign Out</button>
        </form>
      </nav>
    </aside>
  );
}

export function Navigation({
  LinkComponent,
  pathname,
  signOut,
}: NavigationProps) {
  return (
    <NavigationProvider>
      <SidebarNavigation
        LinkComponent={LinkComponent}
        pathname={pathname}
        signOut={signOut}
      />
    </NavigationProvider>
  );
}
