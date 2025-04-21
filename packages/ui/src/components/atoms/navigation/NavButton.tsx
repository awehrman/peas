import { ButtonHTMLAttributes } from "react";
import { Button } from "@/components/atoms/Button";

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
