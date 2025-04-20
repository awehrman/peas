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
  return <Button {...props}>{children}</Button>;
}
