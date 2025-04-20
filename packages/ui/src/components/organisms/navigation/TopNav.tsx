import { Menu, X } from "lucide-react";
import { NavButton } from "@/components/atoms/navigation/NavButton";
import { NavItem } from "@/components/molecules/navigation/NavItem";
import { NavigationItem } from "@/components/types/navigation";
import { useNavigation } from "@/components/contexts/NavigationContext";
import { cn } from "@/lib/utils";

interface TopNavProps {
  items: NavigationItem[];
}

export function TopNav({ items }: TopNavProps) {
  const { isTopNavOpen, setIsTopNavOpen } = useNavigation();

  return (
    <div
      className={cn(
        "bg-primary w-full transition-all duration-300",
        isTopNavOpen ? "min-h-screen" : "h-10"
      )}
    >
      <div className="relative h-full">
        <div className="absolute top-0 right-0 p-2">
          <NavButton
            variant="icon"
            onClick={() => setIsTopNavOpen(!isTopNavOpen)}
            aria-label={
              isTopNavOpen ? "Close navigation menu" : "Open navigation menu"
            }
            className="text-white bg-transparent border-none hover:bg-primary-600"
          >
            {isTopNavOpen ? (
              <X size={24} className="text-white" />
            ) : (
              <Menu size={24} className="text-white" />
            )}
          </NavButton>
        </div>
      </div>

      {isTopNavOpen && (
        <nav className="p-4">
          {items.map((item) => (
            <NavItem
              key={item.name}
              {...item}
              onClick={() => setIsTopNavOpen(false)}
            />
          ))}
        </nav>
      )}
    </div>
  );
}
