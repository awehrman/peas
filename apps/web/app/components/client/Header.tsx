"use client";
import { usePathname } from "next/navigation";
import { Header } from "@peas/ui";

export function ClientHeader() {
  const pathname = usePathname();

  // Convert pathname to route name
  let routeName = "Dashboard";
  if (pathname && pathname !== "/") {
    routeName =
      pathname.substring(1).charAt(0).toUpperCase() + pathname.substring(2);
  }

  return <Header routeName={routeName} />;
}
