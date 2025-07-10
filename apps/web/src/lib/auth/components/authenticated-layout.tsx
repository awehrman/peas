"use client";

import { usePathname } from "next/navigation";
import { Navigation, Header } from "@peas/ui";
import Link from "next/link";
import { signOut } from "../actions/sign-out";

const NextLink = ({ ...props }: React.ComponentProps<typeof Link>) => {
  return <Link {...props} />;
};

export function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  console.log("🎯 AuthenticatedLayout:", {
    pathname,
  });

  // Convert pathname to route name
  let routeName = "Dashboard";
  if (pathname && pathname !== "/") {
    routeName =
      pathname.substring(1).charAt(0).toUpperCase() + pathname.substring(2);
  }

  console.log("📝 Route name:", routeName);

  return (
    <div className="flex h-screen">
      <Navigation
        LinkComponent={NextLink}
        pathname={pathname}
        signOut={signOut}
      />
      <div className="flex-1 flex flex-col h-screen">
        <Header routeName={routeName} />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
