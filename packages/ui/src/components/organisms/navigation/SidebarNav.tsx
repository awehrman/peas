import { NavigationItem } from "@/components/types/navigation";
import { NavItem } from "@/components/molecules/navigation/NavItem";
import { NavToggle } from "@/components/molecules/navigation/NavToggle";
import { useNavigation } from "@/components/contexts/NavigationContext";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  items: NavigationItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const { isExpanded, setIsExpanded, sidebarRef } = useNavigation();

  return (
    <div
      className={cn(
        "bg-primary w-full transition-all duration-300",
        isExpanded ? "min-h-screen" : "h-10"
      )}
      ref={sidebarRef}
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
              className="text-white bg-transparent border-none"
            />
          </div>
        </div>
      )}

      {isExpanded && (
        <nav>
          <NavToggle />
          {items.map((item) => (
            <NavItem key={item.name} {...item} />
          ))}
        </nav>
      )}
    </div>
  );
}
