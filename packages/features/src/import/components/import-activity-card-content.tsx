import { ImportActivityStep } from "./import-activity-step";

import type { ImportCard } from "../types/import-types";
import { getStepLabel } from "../utils/activity-helpers";

interface ImportActivityCardContentProps {
  card: ImportCard;
}

/**
 * Card content component - shown when expanded
 * Displays all step statuses with progress details
 */
export function ImportActivityCardContent({
  card,
}: ImportActivityCardContentProps) {
  // Define the order of steps to display
  const stepOrder: Array<keyof ImportCard["status"]> = [
    "uploaded",
    "cleanedNote",
    "savedNote",
    "ingredientProcessing",
    "instructionProcessing",
    "connectingSource",
    "addingImages",
    "addingTags",
    "addingCategories",
    "checkDuplicates",
  ];

  return (
    <div className="space-y-0.5">
      {stepOrder.map((stepKey) => (
        <ImportActivityStep
          key={stepKey}
          label={getStepLabel(stepKey)}
          status={card.status[stepKey]}
        />
      ))}
    </div>
  );
}
