import { LucideIcon } from "lucide-react";
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
    <a href={href} className={className} onClick={onClick}>
      <NavIcon icon={icon} />
      <span>{name}</span>
    </a>
  );
}
