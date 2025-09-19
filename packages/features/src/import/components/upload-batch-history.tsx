import type { UploadBatch } from "../types/import-types";

interface UploadBatchHistoryProps {
  batches: UploadBatch[];
}

/**
 * Component for displaying upload batch history
 */
export function UploadBatchHistory({ batches }: UploadBatchHistoryProps) {
  if (batches.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {batches.map((batch) => (
        <div
          key={batch.importId}
          className={`p-3 rounded-lg border ${
            batch.errorMessage
              ? "bg-red-50 border-red-200"
              : "bg-green-50 border-green-200"
          }`}
        >
          <h4
            className={`font-medium ${
              batch.errorMessage ? "text-red-900" : "text-green-900"
            }`}
          >
            {batch.errorMessage
              ? `Failed to upload ${batch.numberOfFiles} files`
              : `Uploaded ${batch.numberOfFiles} files successfully`}
          </h4>
        </div>
      ))}
    </div>
  );
}
