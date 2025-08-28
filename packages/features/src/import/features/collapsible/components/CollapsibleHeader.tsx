"use client";


import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { CollapsibleHeaderProps } from "../types/collapsible";

export function CollapsibleHeader({
  children,
  isExpanded,
  onToggle,
  className = "",
  disabled = false,
  showIcon = true,
}: CollapsibleHeaderProps): React.ReactElement {
  const handleClick = () => {
    if (!disabled) {
      onToggle();
    }
  };

  return (
    <div
      className={`collapsible-header flex items-center cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'} ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-expanded={isExpanded}
      aria-disabled={disabled}
    >
      {showIcon && (
        <div className="flex-shrink-0 mr-2 transition-transform duration-200">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-gray-600" />
          )}
        </div>
      )}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
