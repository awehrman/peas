import { ReactNode } from "react";

export interface HeaderProps {
  routeName?: string;
  className?: string;
}

export function Header({
  routeName = "Dashboard",
  className = "",
}: HeaderProps): ReactNode {
  return (
    <header
      className={`bg-white border-b border-gray-200 p-10 hidden md:block ${className}`}
    >
      <h1 className="text-2xl font-light text-gray-600">{routeName}</h1>
    </header>
  );
}
