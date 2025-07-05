import * as React from "react";
import { Button, buttonVariants } from "../../ui/button";
import { type VariantProps } from "class-variance-authority";

type NavButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

export function NavButton({
  children,
  className,
  variant,
  size,
  ...props
}: NavButtonProps) {
  return (
    <Button variant={variant} size={size} className={className} {...props}>
      {children}
    </Button>
  );
}
