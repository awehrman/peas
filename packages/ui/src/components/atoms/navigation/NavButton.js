import { Button } from "@/components/atoms/Button";
export function NavButton({ children, className, variant = "default", ...props }) {
    return (<Button variant={variant} className={className} {...props}>
      {children}
    </Button>);
}
