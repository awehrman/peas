import { ReactNode } from "react";
import { NavigationItem } from "../types/navigation";
interface NavigationContextType {
    items: NavigationItem[];
    isExpanded: boolean;
    setIsExpanded: (value: boolean) => void;
    sidebarRef: React.RefObject<HTMLDivElement | null>;
    isTopNavOpen: boolean;
    setIsTopNavOpen: (value: boolean) => void;
    isHovering: boolean;
    setIsHovering: (value: boolean) => void;
}
export declare function NavigationProvider({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useNavigation(): NavigationContextType;
export {};
//# sourceMappingURL=NavigationContext.d.ts.map