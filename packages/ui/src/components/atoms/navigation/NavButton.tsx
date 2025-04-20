import { ButtonHTMLAttributes } from "react";
import { cn } from "../../../lib/utils";
import { Button } from "../Button";

interface NavButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "icon";
}

export function NavButton({
  children,
  className,
  variant = "default",
  ...props
}: NavButtonProps) {
  return (
    <Button
      className={cn(
        "flex items-center justify-center text-white hover:bg-gray-800",
        variant === "icon" && "rounded-md p-2",
        variant === "default" && "rounded-md px-3 py-2",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
