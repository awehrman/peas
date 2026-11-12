import { RouterLink, RouterNavigationProvider } from "./router-navigation";
import type { ViewerSummary } from "~/server/auth.functions";
import { signOutFn } from "~/server/auth.functions";

import { type ReactNode, Suspense, useCallback, useMemo } from "react";

import { useApolloClient } from "@apollo/client/react";
import { Button, Header, Placeholder, Spinner } from "@peas/components";
import { ResponsiveNavigation, getNavigationItems } from "@peas/features";
import { useLocation, useRouter } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";

function ContentErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message =
    error instanceof Error
      ? error.message
      : "Something went wrong loading this page";
  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Placeholder
          label={message}
          icon={<AlertTriangle />}
          button={
            <Button onClick={resetErrorBoundary} variant="outline">
              Try again
            </Button>
          }
        />
      </div>
    </div>
  );
}

/** "Dashboard" for "/", otherwise the first path segment capitalized ("/notes/abc" -> "Notes"). */
export function getRouteName(pathname: string): string {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (!firstSegment) return "Dashboard";
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
}

/** The signed-in app shell: navigation, header, and an error boundary around the page. */
export function AuthenticatedLayout({
  viewer,
  children,
}: {
  viewer: ViewerSummary;
  children: ReactNode;
}) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const router = useRouter();
  const client = useApolloClient();
  const navigationItems = useMemo(
    () => getNavigationItems(viewer.isAdmin),
    [viewer.isAdmin]
  );

  const signOut = useCallback(async () => {
    await signOutFn();
    await client.clearStore();
    await router.navigate({ to: "/login" });
  }, [client, router]);

  return (
    <RouterNavigationProvider>
      <div className="flex h-screen">
        <ResponsiveNavigation
          navigationItems={navigationItems}
          LinkComponent={RouterLink}
          pathname={pathname}
          signOut={signOut}
          user={{ username: viewer.username, avatarUrl: viewer.avatarUrl }}
        />
        <div className="flex h-screen flex-1 flex-col">
          <Header routeName={getRouteName(pathname)} />
          <main className="flex-1 overflow-auto px-6 py-6 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-7xl">
              <ErrorBoundary
                FallbackComponent={ContentErrorFallback}
                resetKeys={[pathname]}
                onError={(error) => console.error("Page error:", error)}
              >
                <Suspense
                  fallback={
                    <div
                      role="status"
                      aria-label="Loading"
                      className="flex h-full items-center justify-center"
                    >
                      <Spinner />
                    </div>
                  }
                >
                  {children}
                </Suspense>
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </RouterNavigationProvider>
  );
}
