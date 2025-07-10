"use client";

import { useAuth } from "../../lib/auth/hooks/use-auth";
import ClientHeader from "./header";
import ClientNavigation from "./navigation";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isFetched } = useAuth();

  // Don't render anything until we've fetched the auth state
  if (!isFetched) {
    return (
      <div className="flex h-screen">
        <div className="flex-1 flex flex-col h-screen">
          <main className="flex-1 overflow-auto p-8">{children}</main>
        </div>
      </div>
    );
  }

  // If user is authenticated, show full layout with navigation
  if (user) {
    return (
      <div className="flex h-screen">
        <ClientNavigation />
        <div className="flex-1 flex flex-col h-screen">
          <ClientHeader />
          <main className="flex-1 overflow-auto p-8">{children}</main>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show layout without navigation
  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col h-screen">
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
