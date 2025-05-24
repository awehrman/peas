import { LucideIcon } from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface NavigationProps {
  LinkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
  }>;
}
