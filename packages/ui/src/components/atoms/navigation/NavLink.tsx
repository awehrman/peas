import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  to: string;
  className?: string;
  children: React.ReactNode;
}

export function NavLink({ to, className, children }: NavLinkProps) {
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}
