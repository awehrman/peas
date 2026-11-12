"use client";

import { Suspense, useMemo } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button, Header, Placeholder, Spinner, cn } from "@peas/components";
import {
  AppNavigationProvider,
  type NavigationUser,
  ResponsiveNavigation,
  getNavigationItems,
} from "@peas/features";
import { AlertTriangle } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import { signOut } from "../actions/sign-out";

const NextLink = ({ ...props }: React.ComponentProps<typeof Link>) => {
  return <Link {...props} />;
};

function ContentErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="max-w-md w-full">
        <Placeholder
          label={error.message || "Something went wrong loading this page"}
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

function getRouteName(pathname: string | null): string {
  const firstSegment = pathname?.split("/").filter(Boolean)[0];
  if (!firstSegment) return "Dashboard";
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
}

export function AuthenticatedLayout({
  children,
  isAdmin,
  user,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
  user: NavigationUser;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const navigationItems = useMemo(() => getNavigationItems(isAdmin), [isAdmin]);
  const routeName = getRouteName(pathname);

  return (
    <AppNavigationProvider LinkComponent={NextLink} push={router.push}>
      <div className="flex h-screen">
        <ResponsiveNavigation
          navigationItems={navigationItems}
          LinkComponent={NextLink}
          pathname={pathname}
          signOut={signOut}
          user={user}
        />
        <div className={cn("flex-1 flex flex-col h-screen")}>
          <Header routeName={routeName} />
          <main className="flex-1 overflow-auto px-6 py-6 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-7xl">
              <ErrorBoundary
                FallbackComponent={ContentErrorFallback}
                onError={(error, errorInfo) => {
                  console.error("AuthenticatedLayout Error:", {
                    error: error.message,
                    errorInfo,
                  });
                }}
              >
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
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
    </AppNavigationProvider>
  );
}
