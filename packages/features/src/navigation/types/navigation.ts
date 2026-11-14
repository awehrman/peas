import type { CSSProperties, ReactNode, ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Shown to whoever may curate food knowledge (see `canCurateKnowledge` in the web app). */
  curatorOnly?: boolean;
  /** Other sections that light this item up, e.g. Knowledge for /concepts and /lexicon. */
  activePaths?: string[];
}

export interface NavigationUser {
  username: string;
  avatarUrl?: string | null;
}

export interface NavigationProps {
  LinkComponent?: ComponentType<NavigationLinkComponentProps>;
  pathname?: string;
  signOut: () => Promise<void>;
  user?: NavigationUser;
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
