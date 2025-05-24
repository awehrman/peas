import { ButtonHTMLAttributes } from "react";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline" | "ghost" | "link" | "icon";
    size?: "default" | "sm" | "lg" | "icon";
    asChild?: boolean;
}
export declare function Button({ children, className, variant, size, ...props }: ButtonProps): import("react").JSX.Element;
//# sourceMappingURL=Button.d.ts.map