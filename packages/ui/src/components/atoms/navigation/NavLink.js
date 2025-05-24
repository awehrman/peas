import { forwardRef } from "react";
import { cn } from "@/lib/utils";
export const NavLink = forwardRef(({ className, active, children, ...props }, ref) => {
    return (<a ref={ref} className={cn("flex items-center gap-3 w-full p-3 rounded-md transition-colors", active
            ? "bg-green-500 text-white"
            : "hover:bg-green-500/50 text-white", className)} {...props}>
        {children}
      </a>);
});
NavLink.displayName = "NavLink";
