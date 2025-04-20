"use client";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();

  let routeName = "Dashboard";

  if (pathname !== "/") {
    routeName =
      pathname.substring(1).charAt(0).toUpperCase() + pathname.substring(2);
  }
  return <header>{routeName}</header>;
}
