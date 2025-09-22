"use client";

import { Suspense } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button, Header, Placeholder, Spinner, cn } from "@peas/components";
import { ResponsiveNavigation, navigationItems } from "@peas/features";
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

export function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Convert pathname to route name
  let routeName = "Dashboard";
  if (pathname && pathname !== "/") {
    routeName =
      pathname.substring(1).charAt(0).toUpperCase() + pathname.substring(2);
  }

  return (
    <div className="flex h-screen">
      <ResponsiveNavigation
        navigationItems={navigationItems}
        LinkComponent={NextLink}
        pathname={pathname}
        signOut={signOut}
      />
      <div className={cn("flex-1 flex flex-col h-screen")}>
        <Header routeName={routeName} />
        <main className="flex-1 overflow-auto p-10">
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
        </main>
      </div>
    </div>
  );
}
