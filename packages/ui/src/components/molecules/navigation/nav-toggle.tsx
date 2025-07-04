import { MoreVertical } from "lucide-react";
import { NavButton } from "../../atoms/navigation/nav-button";
import { useNavigation } from "../../contexts/NavigationContext";

interface NavToggleProps {
  position?: number;
  className?: string;
}

export function NavToggle({ position, className }: NavToggleProps) {
  const { isExpanded, setIsExpanded } = useNavigation();

  return (
    <div>
      <NavButton
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        <MoreVertical size={16} className={isExpanded ? "rotate-90" : ""} />
      </NavButton>
    </div>
  );
}
