"use client";

import {
  type ComponentType,
  type ReactNode,
  createContext,
  useContext,
} from "react";

import type { NavigationLinkComponentProps } from "../navigation/types/navigation";

export interface AppNavigationValue {
  LinkComponent: ComponentType<NavigationLinkComponentProps>;
  push: (href: string) => void;
}

function DefaultLink({ children, ...props }: NavigationLinkComponentProps) {
  return <a {...props}>{children}</a>;
}

const defaultValue: AppNavigationValue = {
  LinkComponent: DefaultLink,
  push: (href) => {
    window.location.assign(href);
  },
};

const AppNavigationContext = createContext<AppNavigationValue>(defaultValue);

interface AppNavigationProviderProps {
  LinkComponent?: ComponentType<NavigationLinkComponentProps>;
  push?: (href: string) => void;
  children: ReactNode;
}

/**
 * Lets feature components link and navigate without depending on a framework
 * router. The web app supplies Next's Link and router.push.
 */
export function AppNavigationProvider({
  LinkComponent = defaultValue.LinkComponent,
  push = defaultValue.push,
  children,
}: AppNavigationProviderProps) {
  return (
    <AppNavigationContext.Provider value={{ LinkComponent, push }}>
      {children}
    </AppNavigationContext.Provider>
  );
}

export function useAppNavigation(): AppNavigationValue {
  return useContext(AppNavigationContext);
}

export function AppLink({ children, ...props }: NavigationLinkComponentProps) {
  const { LinkComponent } = useAppNavigation();
  return <LinkComponent {...props}>{children}</LinkComponent>;
}
