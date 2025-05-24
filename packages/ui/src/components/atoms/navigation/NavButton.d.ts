import { ButtonProps } from "@/components/atoms/Button";
type NavButtonProps = Omit<ButtonProps, "variant"> & {
    variant?: "default" | "icon";
};
export declare function NavButton({ children, className, variant, ...props }: NavButtonProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=NavButton.d.ts.map