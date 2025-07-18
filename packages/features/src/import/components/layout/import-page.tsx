import { ReactNode } from "react";
import { StatsSummary } from "../dashboard/stats-summary";
import { ActivityLog } from "../activity-log/activity-log";
import { getImportStats } from "../../actions";
import { ImportFileUpload } from "../file-upload/file-upload";

export async function ImportPageContent(): Promise<ReactNode> {
  const { noteCount, ingredientCount, parsingErrorCount } =
    await getImportStats();

  return (
    <>
      <div className="flex justify-between items-start gap-8">
        {/* Left Column */}
        <div className="flex-1">
          <StatsSummary
            noteCount={noteCount}
            ingredientCount={ingredientCount}
            parsingErrorCount={parsingErrorCount}
            className="mb-8"
          />
          <ActivityLog className="mb-8" />
        </div>

        {/* Right Column */}
        <div className="flex-1">
          <ImportFileUpload maxFileSize="10MB" />
        </div>
      </div>
    </>
  );
}
