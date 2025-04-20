import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavIconProps {
  icon: LucideIcon;
  className?: string;
}

export function NavIcon({ icon: Icon, className }: NavIconProps) {
  return <Icon className={cn("h-5 w-5", className)} />;
}
