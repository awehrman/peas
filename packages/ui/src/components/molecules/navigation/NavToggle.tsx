import { MoreVertical } from "lucide-react";
import { NavButton } from "@/components/atoms/navigation/NavButton";
import { useNavigation } from "@/components/contexts/NavigationContext";

interface NavToggleProps {
  position?: number;
  className?: string;
}

export function NavToggle({ position, className }: NavToggleProps) {
  const { isExpanded, setIsExpanded } = useNavigation();

  return (
    <div>
      <NavButton
        variant="icon"
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
