"use client";

import { TopNav } from "./TopNav";
import { SidebarNav } from "./SidebarNav";
import { NavigationItem } from "@/components/types/navigation";
import { NavigationProvider } from "@/components/contexts/NavigationContext";

interface NavigationProps {
  items: NavigationItem[];
}

export function Navigation({ items }: NavigationProps) {
  return (
    <NavigationProvider>
      <TopNav items={items} />
      <SidebarNav items={items} />
    </NavigationProvider>
  );
}
