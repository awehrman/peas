import { ButtonHTMLAttributes } from "react";
import { Button, ButtonProps } from "../Button";

type NavButtonProps = Omit<ButtonProps, "variant"> & {
  variant?: "default" | "icon";
};

export function NavButton({
  children,
  className,
  variant = "default",
  ...props
}: NavButtonProps) {
  return (
    <Button variant={variant} className={className} {...props}>
      {children}
    </Button>
  );
}
