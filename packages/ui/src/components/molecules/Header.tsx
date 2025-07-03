"use client";
import { usePathname } from "next/navigation";

export function Header() {
  const currentPath = usePathname();
  let routeName = "Dashboard";

  if (currentPath !== "/") {
    routeName =
      currentPath.substring(1).charAt(0).toUpperCase() +
      currentPath.substring(2);
  }

  return (
    <header className="bg-white border-b border-gray-200 p-10 hidden md:block">
      <h1 className="text-2xl font-light text-gray-900">{routeName}</h1>
    </header>
  );
} 