interface LinkComponentProps {
    href: string;
    className?: string;
    active?: boolean;
    children: React.ReactNode;
}
interface SidebarNavProps {
    LinkComponent?: React.ComponentType<LinkComponentProps>;
}
export declare function SidebarNav({ LinkComponent }: SidebarNavProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=SidebarNav.d.ts.map