import { LucideIcon } from "lucide-react";

interface NavIconProps {
  icon: LucideIcon;
  className?: string;
}

export function NavIcon({ icon: Icon, className }: NavIconProps) {
  return <Icon className={className} />;
}
