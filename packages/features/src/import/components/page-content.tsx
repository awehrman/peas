import { ReactNode } from "react";
import { PendingReview, RecentlyImported } from "./index";
import { getImportStats } from "../actions";
import { FileUploadWithQueue } from "./file-upload-with-queue";

export async function ImportPageContent(): Promise<ReactNode> {
  const { noteCount, ingredientCount, parsingErrorCount } =
    await getImportStats();

  return (
    <>
      <div className="flex justify-between items-start gap-8">
        {/* Left Column */}
        <div className="flex-1">
          <PendingReview
            noteCount={noteCount}
            ingredientCount={ingredientCount}
            parsingErrorCount={parsingErrorCount}
            className="mb-8"
          />
          <RecentlyImported className="mb-8" />
        </div>

        {/* Right Column */}
        <div className="flex-1">
          <FileUploadWithQueue maxFileSize="10MB" />
        </div>
      </div>
    </>
  );
}
