import {
  Home,
  CloudDownload,
  Carrot,
  CookingPot,
  StickyNote,
} from "lucide-react";
import { NavigationItem } from "../components/types/navigation";

export const navigationItems: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Import", href: "/import", icon: CloudDownload },
  { name: "Ingredients", href: "/ingredients", icon: Carrot },
  { name: "Recipes", href: "/recipes", icon: CookingPot },
  { name: "Notes", href: "/notes", icon: StickyNote },
];
