import type { CSSProperties } from "react";

import { Toggle, cn } from "@peas/components";
import { MoreVertical } from "lucide-react";

import { NAVIGATION_CONSTANTS } from "../config/constants";

interface NavigationToggleProps {
  ariaLabel: string;
  isExpanded: boolean;
  onToggleChange: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  style?: CSSProperties;
}

export function NavigationToggle({
  ariaLabel,
  isExpanded,
  onToggleChange,
  onHoverStart = () => undefined,
  onHoverEnd = () => undefined,
  style,
}: NavigationToggleProps) {
  return (
    <div style={style}>
      <Toggle
        pressed={isExpanded}
        onPressedChange={onToggleChange}
        size={NAVIGATION_CONSTANTS.TOGGLE_SIZE}
        variant="default"
        aria-label={ariaLabel}
        className={cn(
          "absolute z-50 h-6 w-6 bg-transparent hover:bg-transparent focus:bg-transparent focus-visible:bg-transparent data-[state=on]:bg-transparent text-neutral-400 transition-colors duration-200 hover:text-neutral-300 focus:text-neutral-300 focus-visible:text-neutral-300 data-[state=on]:text-neutral-300",
          NAVIGATION_CONSTANTS.TOGGLE_TRANSITION
        )}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
      >
        <MoreVertical className="h-4 w-4 pointer-events-none" />
      </Toggle>
    </div>
  );
}

