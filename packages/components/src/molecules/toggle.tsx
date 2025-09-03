"use client";

import { Toggle as ShadcnToggle } from "../ui/toggle";

// Generic toggle interface
export interface GenericToggleProps {
  isOn: boolean;
  onToggle: () => void;
  onIcon: React.ComponentType<{ className?: string }>;
  offIcon: React.ComponentType<{ className?: string }>;
  className?: string;
  ariaLabel?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline";
}

export function GenericToggle({
  isOn,
  onToggle,
  onIcon: OnIcon,
  offIcon: OffIcon,
  className,
  ariaLabel = "Toggle",
  size = "default",
  variant = "default",
}: GenericToggleProps) {
  return (
    <ShadcnToggle
      pressed={isOn}
      onPressedChange={onToggle}
      variant={variant}
      size={size}
      className={className}
      aria-label={ariaLabel}
    >
      {isOn ? <OnIcon className="h-4 w-4" /> : <OffIcon className="h-4 w-4" />}
    </ShadcnToggle>
  );
}
