import { NavigationItem } from "@/components/types/navigation";
import { NavItem } from "@/components/molecules/navigation/NavItem";
import { NavToggle } from "@/components/molecules/navigation/NavToggle";
import { useNavigation } from "@/components/contexts/NavigationContext";
import { cn } from "@/lib/utils";
import { RefObject } from "react";

interface SidebarNavProps {
  items: NavigationItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const { isExpanded, setIsExpanded, sidebarRef } = useNavigation();

  return (
    <div
      className={cn(
        "bg-red-500 text-white w-full transition-all duration-300",
        isExpanded ? "min-h-screen" : "h-10"
      )}
      ref={sidebarRef as RefObject<HTMLDivElement>}
      // onMouseMove={handleMouseMove}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      {!isExpanded && (
        <div className="relative h-full">
          <div
            className="absolute top-0 right-0 p-2"
            // style={{ top: `${buttonPosition}%`, transform: "translateY(-50%)" }}
          >
            <NavToggle
              // position={buttonPosition}
              className="text-white hover:text-white/80 bg-transparent border-none"
            />
          </div>
        </div>
      )}

      {isExpanded && (
        <nav className="p-4 space-y-2">
          <NavToggle className="text-white hover:text-white/80" />
          {items.map((item) => (
            <NavItem
              key={item.name}
              {...item}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-white/10 transition-colors"
            />
          ))}
        </nav>
      )}
    </div>
  );
}
