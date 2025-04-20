import { Menu, X } from "lucide-react";
import { NavButton } from "@/components/atoms/navigation/NavButton";
import { NavItem } from "@/components/molecules/navigation/NavItem";
import { NavigationItem } from "@/components/types/navigation";
import { useNavigation } from "@/components/contexts/NavigationContext";

interface TopNavProps {
  items: NavigationItem[];
}

export function TopNav({ items }: TopNavProps) {
  const { isTopNavOpen, setIsTopNavOpen } = useNavigation();

  return (
    <>
      <div className="flex h-16 items-center justify-between border-b bg-black px-4 lg:hidden">
        <div className="text-xl font-bold text-white">MyApp</div>
        <NavButton
          variant="icon"
          onClick={() => setIsTopNavOpen(!isTopNavOpen)}
          aria-label={
            isTopNavOpen ? "Close navigation menu" : "Open navigation menu"
          }
        >
          {isTopNavOpen ? <X size={24} /> : <Menu size={24} />}
        </NavButton>
      </div>

      {isTopNavOpen && (
        <div className="border-b bg-black lg:hidden">
          <nav className="flex flex-col space-y-1 px-2 py-3">
            {items.map((item) => (
              <NavItem
                key={item.name}
                {...item}
                onClick={() => setIsTopNavOpen(false)}
              />
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
