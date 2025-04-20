import { TopNav } from "./TopNav";
import { SidebarNav } from "./SidebarNav";
import { NavigationItem } from "../../types/navigation";
import { NavigationProvider } from "../../contexts/NavigationContext";

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
