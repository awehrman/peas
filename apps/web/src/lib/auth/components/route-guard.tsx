"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuth } from "../queries/get-auth";
import { loginPath } from "../../../paths";
import { PUBLIC_ROUTES } from "../constants";
import { AuthenticatedLayout } from "./authenticated-layout";

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

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

  // This should not happen, but just in case
  return null;
}
