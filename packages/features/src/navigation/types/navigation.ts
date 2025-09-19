import React from "react";

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
    onClick?: () => void;
  }>;
  pathname?: string;
  signOut: () => Promise<void>;
}
