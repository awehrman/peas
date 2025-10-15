import type { ImportCard } from "../types/import-types";
import { calculateCardProgress } from "../utils/activity-helpers";

interface ImportActivityCardHeaderProps {
  card: ImportCard;
}

/**
 * Card header component - shown when collapsed
 * Displays note title/importId and progress percentage
 */
export function ImportActivityCardHeader({
  card,
}: ImportActivityCardHeaderProps) {
  const progress = calculateCardProgress(card);
  const isComplete = progress === 100;
  const hasError = Object.values(card.status).some((step) => step.hasError);

  // Use note title if available (stored in imageThumbnail for now), otherwise use ID
  const displayTitle = card.imageThumbnail || `Note ${card.id}`;

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        {!isComplete && !hasError && (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        )}
        {isComplete && <span className="text-green-600 text-xl">✅</span>}
        {hasError && <span className="text-red-600 text-xl">❌</span>}

        <div>
          <h3 className="font-medium text-gray-900">
            Importing {displayTitle}...
          </h3>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-semibold ${
            hasError
              ? "text-red-600"
              : isComplete
                ? "text-green-600"
                : "text-blue-600"
          }`}
        >
          {progress}%
        </span>
      </div>
    </div>
  );
}
