import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "../../../lib/utils";
import { NavIcon } from "../../atoms/navigation/NavIcon";

interface NavItemProps {
  name: string;
  href: string;
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export function NavItem({
  name,
  href,
  icon,
  onClick,
  className,
}: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center rounded-md px-3 py-2 text-white hover:bg-gray-800",
        className
      )}
      onClick={onClick}
    >
      <NavIcon icon={icon} className="mr-3 h-5 w-5" />
      <span>{name}</span>
    </Link>
  );
}
