import type { CSSProperties, ReactNode, ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface NavigationProps {
  LinkComponent?: ComponentType<NavigationLinkComponentProps>;
  pathname?: string;
  signOut: () => Promise<void>;
}

export interface NavigationLinkComponentProps {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  "aria-current"?: "page" | undefined;
  "aria-label"?: string;
}

export interface PureNavigationProps extends NavigationProps {
  navigationItems: NavigationItem[];
}

export interface ResponsiveNavigationProps extends PureNavigationProps {
  breakpoint?: number;
}
