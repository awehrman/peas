import { ImportActivityCardContent } from "./import-activity-card-content";
import { ImportActivityCardHeader } from "./import-activity-card-header";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@peas/components";

import type { ImportCard } from "../types/import-types";

interface ImportActivityCardProps {
  card: ImportCard;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Main card component wrapper
 * Handles expand/collapse functionality and renders header/content
 */
export function ImportActivityCard({
  card,
  isExpanded,
  onToggle,
}: ImportActivityCardProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <CollapsibleTrigger asChild>
          <button
            className="w-full text-left hover:bg-gray-50 px-4 py-3 rounded-t-lg transition-colors"
            aria-label={
              isExpanded ? "Collapse card details" : "Expand card details"
            }
          >
            <ImportActivityCardHeader card={card} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 py-3 border-t bg-gray-50">
            <ImportActivityCardContent card={card} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
