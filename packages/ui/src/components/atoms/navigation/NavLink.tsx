import { forwardRef } from "react";
import { cn } from "../../../lib/utils";

interface NavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, active, children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(
          "flex items-center gap-3 w-full p-3 rounded-md transition-colors",
          active ? "bg-mint-500 text-white" : "hover:bg-mint-500/50 text-white",
          className
        )}
        {...props}
      >
        {children}
      </a>
    );
  }
);

NavLink.displayName = "NavLink";
