"use client";
import { ReactNode } from "react";
import { FileUpload } from "@peas/ui";
import { PendingReview, RecentlyImported } from "@peas/features";

export default function ImportPageRoute(): ReactNode {
  const noteCount = 1;
  const ingredientCount = 0;
  const parsingErrorCount = 0;

  const recentlyImportedItems = [
    { text: 'Processing note "Summer Peach Fattoush".', indentLevel: 0 },
    {
      text: 'Added note "Summer Peach Fattoush" with ID 12345.',
      indentLevel: 1,
    },
    { text: "Successfully uploaded image.", indentLevel: 1 },
    { text: "Starting processing note content (5%):", indentLevel: 1 },
    {
      text: "...[0%] Processing 0 out of 10 ingredient lines.",
      indentLevel: 2,
    },
    {
      text: "...[10%] Processing 1 out of 10 instruction lines.",
      indentLevel: 2,
    },
    { text: "Finishing importing note 12345 with 0 errors.", indentLevel: 1 },
  ];

  // const handleFileUpload = (file: File) => {
  //   console.log("File uploaded:", file.name);
  //   // Add your file upload logic here
  // };

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
          <RecentlyImported items={recentlyImportedItems} />
        </div>

        {/* Right Column */}
        <div className="flex-1">
          <FileUpload
            // onFileUpload={handleFileUpload}
            maxFileSize="10MB"
          />
        </div>
      </div>
    </>
  );
}
