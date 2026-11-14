import { type MouseEvent, type ReactNode, useCallback } from "react";

import {
  AppNavigationProvider,
  type NavigationLinkComponentProps,
} from "@peas/features";
import { type NavigateOptions, useRouter } from "@tanstack/react-router";

/**
 * Router-core accepts a bare `href` (buildLocation parses it into path and search), but the public types require `to`, so plain hrefs from feature components go through this one helper.
 */
function hrefLocation(href: string): NavigateOptions {
  return { href } as unknown as NavigateOptions;
}

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * Feature components build plain hrefs with query strings ("/notes?status=FAILED"). This renders a real anchor (so new-tab and copy-link work) and routes plain clicks through TanStack Router, preloading the target on hover.
 */
export function RouterLink({
  href,
  children,
  onClick,
  ...props
}: NavigationLinkComponentProps) {
  const router = useRouter();

  return (
    <a
      href={href}
      {...props}
      onMouseEnter={() => {
        router.preloadRoute(hrefLocation(href)).catch(() => undefined);
      }}
      onClick={(event) => {
        onClick?.();
        if (event.defaultPrevented || !isPlainLeftClick(event)) return;
        event.preventDefault();
        void router.navigate(hrefLocation(href));
      }}
    >
      {children}
    </a>
  );
}

/** Supplies TanStack Router navigation to every @peas/features component below it. */
export function RouterNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const push = useCallback(
    (href: string) => void router.navigate(hrefLocation(href)),
    [router]
  );
  return (
    <AppNavigationProvider LinkComponent={RouterLink} push={push}>
      {children}
    </AppNavigationProvider>
  );
}
