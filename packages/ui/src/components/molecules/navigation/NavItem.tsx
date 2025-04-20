import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavIcon } from "@/components/atoms/navigation/NavIcon";

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
    <Link href={href} className={className} onClick={onClick}>
      <NavIcon icon={icon} />
      <span>{name}</span>
    </Link>
  );
}
