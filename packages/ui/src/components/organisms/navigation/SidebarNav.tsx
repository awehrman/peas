import { cn } from "../../../lib/utils";
import { NavigationItem } from "../../types/navigation";
import { NavItem } from "../../molecules/navigation/NavItem";
import { NavToggle } from "../../molecules/navigation/NavToggle";
import { useNavigation } from "../../contexts/NavigationContext";

interface SidebarNavProps {
  items: NavigationItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const {
    isExpanded,
    setIsExpanded,
    buttonPosition,
    sidebarRef,
    handleMouseMove,
  } = useNavigation();

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "hidden bg-black transition-all duration-300 ease-in-out lg:flex lg:flex-col relative",
        isExpanded ? "lg:w-64" : "lg:w-[40px]"
      )}
      onMouseMove={handleMouseMove}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      {!isExpanded && (
        <NavToggle
          position={buttonPosition}
          className="absolute left-1/2 -translate-x-1/2 transition-all duration-150"
        />
      )}

      {isExpanded && (
        <>
          <nav className="flex flex-col space-y-1 px-2 py-3">
            {items.map((item) => (
              <NavItem key={item.name} {...item} />
            ))}
          </nav>

          <div className="mt-auto p-2">
            <NavToggle className="w-full" />
          </div>
        </>
      )}
    </div>
  );
}
