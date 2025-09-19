import type { UploadBatch } from "../types/import-types";

interface UploadProgressProps {
  batch: UploadBatch;
}

/**
 * Component for displaying current upload progress
 */
export function UploadProgressDisplay({ batch }: UploadProgressProps) {
  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="font-medium text-blue-900">
        Uploading {batch.numberOfFiles} files...
      </h4>
    </div>
  );
}
