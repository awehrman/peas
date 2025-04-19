import Link from "next/link";
import { MainNav } from "../molecules/navigation/main-nav";
import { UserNav } from "../molecules/navigation/user-nav";
import { cn } from "../../lib/utils";

interface SiteHeaderProps {
  className?: string;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function SiteHeader({ className, user }: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="container flex h-14 items-center">
        <MainNav
          items={[
            {
              title: "Recipes",
              href: "/recipes",
            },
            {
              title: "Notes",
              href: "/notes",
            },
            {
              title: "Ingredients",
              href: "/ingredients",
            },
            {
              title: "Import",
              href: "/import",
            },
          ]}
        />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <UserNav user={user} />
        </div>
      </div>
    </header>
  );
}
