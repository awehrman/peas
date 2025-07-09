import {
  Home,
  CloudDownload,
  Carrot,
  CookingPot,
  StickyNote,
  LogOut,
} from "lucide-react";
import { NavigationItem } from "../components/types/navigation";

export const navigationItems: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Import", href: "/import", icon: CloudDownload },
  { name: "Ingredients", href: "/ingredients", icon: Carrot },
  { name: "Recipes", href: "/recipes", icon: CookingPot },
  { name: "Notes", href: "/notes", icon: StickyNote },
  { name: "Logout", href: "/login", icon: LogOut },
];
