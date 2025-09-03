import {
  Carrot,
  CloudDownload,
  CookingPot,
  Home,
  StickyNote,
} from "lucide-react";

import { NavigationItem } from "../types/navigation";

export const navigationItems: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Import", href: "/import", icon: CloudDownload },
  { name: "Ingredients", href: "/ingredients", icon: Carrot },
  { name: "Recipes", href: "/recipes", icon: CookingPot },
  { name: "Notes", href: "/notes", icon: StickyNote },
];
