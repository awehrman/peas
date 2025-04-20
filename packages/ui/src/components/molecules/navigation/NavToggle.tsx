import { MoreVertical } from "lucide-react";
import { NavButton } from "../../atoms/navigation/NavButton";
import { useNavigation } from "../../contexts/NavigationContext";

interface NavToggleProps {
  position?: number;
  className?: string;
}

export function NavToggle({ position, className }: NavToggleProps) {
  const { isExpanded, setIsExpanded } = useNavigation();

  return (
    <div
      className={className}
      style={
        position !== undefined
          ? {
              top: `${position}%`,
              transform: "translate(-50%, -50%)",
            }
          : undefined
      }
    >
      <NavButton
        variant="icon"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="h-8 w-5 hover:text-gray-300"
        aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        <MoreVertical size={16} className={isExpanded ? "rotate-90" : ""} />
      </NavButton>
    </div>
  );
}
