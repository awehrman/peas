import type { CSSProperties, ReactNode, ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
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
}

export interface PureNavigationProps extends NavigationProps {
  navigationItems: NavigationItem[];
}

export interface ResponsiveNavigationProps extends PureNavigationProps {
  breakpoint?: number;
}
