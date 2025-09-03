import React from "react";

export interface HeaderProps {
  routeName?: string;
  className?: string;
}

export function Header({
  routeName = "Dashboard",
  className = "",
}: HeaderProps) {
  return (
    <header
      className={`bg-background border-b border-border p-10 md:block ${className}`}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light text-foreground">{routeName}</h1>
      </div>
    </header>
  );
}
