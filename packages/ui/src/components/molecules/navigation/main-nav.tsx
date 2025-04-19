import Link from "next/link";
import { cn } from "../../../lib/utils";

interface MainNavProps {
  items?: {
    title: string;
    href: string;
  }[];
  className?: string;
}

export function MainNav({ items, className }: MainNavProps) {
  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)}>
      {items?.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm font-medium transition-colors hover:text-primary"
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
