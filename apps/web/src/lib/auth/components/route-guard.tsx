"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { AlertTriangle } from "lucide-react";
import { Button, Placeholder } from "@peas/ui";
import { getAuth } from "../queries/get-auth";
import { loginPath } from "../../../paths";
import { PUBLIC_ROUTES } from "../constants";
import { AuthenticatedLayout } from "./authenticated-layout";

interface RouteGuardProps {
  children: React.ReactNode;
}

function RouteGuardErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full">
        <Placeholder
          label={error.message || "There was a problem with authentication"}
          icon={<AlertTriangle />}
          button={
            <div className="flex gap-3">
              <Button onClick={resetErrorBoundary} variant="outline">
                Try again
              </Button>
              <Button
                onClick={() => (window.location.href = "/login")}
                variant="outline"
              >
                Go to login
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}

function RouteGuardContent({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      console.log("🔐 RouteGuard: Debug info:", {
        pathname,
        publicRoutes: PUBLIC_ROUTES,
      });

      // Skip auth check for public pages
      const isPublicPage = PUBLIC_ROUTES.some((route) =>
        pathname.startsWith(route)
      );

      console.log("🔐 RouteGuard: Route check:", {
        pathname,
        isPublicPage,
        matchingRoute: PUBLIC_ROUTES.find((route) =>
          pathname.startsWith(route)
        ),
      });

      if (isPublicPage) {
        console.log("🔐 RouteGuard: On public page, skipping auth check");
        setIsLoading(false);
        return;
      }

      console.log("🔐 RouteGuard: Checking authentication...");

      try {
        const { user } = await getAuth();

        console.log("🔐 RouteGuard: Auth result:", {
          hasUser: !!user,
          userId: user?.id,
        });

        if (!user) {
          console.log("🔐 RouteGuard: No user, redirecting to login");
          router.push(loginPath());
          return;
        }

        console.log(
          "🔐 RouteGuard: User authenticated, rendering authenticated layout"
        );
        setIsAuthenticated(true);
      } catch (error) {
        console.error("🔐 RouteGuard: Auth error:", error);
        router.push(loginPath());
        return;
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [pathname, router]);

  // For public pages, render children directly
  const isPublicPage = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isPublicPage) {
    return <>{children}</>;
  }

  // For protected pages, render authenticated layout if authenticated
  if (isAuthenticated) {
    return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
  }

  // Show loading state while checking auth
  if (isLoading) {
    return null; // Let Suspense handle the loading UI
  }

  // This should not happen, but just in case
  return null;
}

export function RouteGuard({ children }: RouteGuardProps) {
  return (
    <ErrorBoundary
      FallbackComponent={RouteGuardErrorFallback}
      onError={(error, errorInfo) => {
        console.error("🔴 RouteGuard Error:", error, errorInfo);
      }}
      onReset={() => {
        // Clear any auth-related state or redirect to login
        window.location.href = "/login";
      }}
    >
      <RouteGuardContent>{children}</RouteGuardContent>
    </ErrorBoundary>
  );
}
