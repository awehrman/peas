"use client";

import { ImportFileUpload } from "../components/import-file-upload";
import { useActivityDerived } from "../context/activity/selectors";
import { useImport } from "../hooks/use-import";
import { useInitialization } from "../hooks/use-initialization";
import type { FileUploadItem } from "../types/import-types";

interface ImportPageProps {
  /** Initial note count from server (defaults to 0) */
  initialNoteCount?: number;
  /** Initial ingredient count from server (defaults to 0) */
  initialIngredientCount?: number;
  /** Initial parsing error count from server (defaults to 0) */
  initialParsingErrorCount?: number;
}

/**
 * Main import page component that demonstrates the context setup
 * Currently shows basic logging to confirm contexts are working
 */
export function ImportPage({
  initialNoteCount = 0,
  initialIngredientCount = 0,
  initialParsingErrorCount = 0,
}: ImportPageProps) {
  const { upload, stats, ws } = useImport();
  const { numPages, totalImported, currentPageIndex } = useActivityDerived();

  useInitialization({
    initialNoteCount,
    initialIngredientCount,
    initialParsingErrorCount,
    enableDemoInit: false, // Disable demo init to show true initial state
  });

  const handleAddNote = () => {
    stats.dispatch({ type: "INCREMENT_NOTES", count: 1 });
  };

  const handleCompleteBatch = () => {
    upload.dispatch({
      type: "COMPLETE_BATCH",
      successMessage: "Test batch completed successfully",
    });
  };

  // Debug actions for file upload states
  const handleSimulateInitialState = () => {
    // Reset to truly initial state by clearing all batches
    upload.dispatch({ type: "CLEAR_ALL_BATCHES" });
  };

  const handleSimulateUploadingState = () => {
    const mockFiles: FileUploadItem[] = [
      {
        id: "html-test.html",
        file: new File(["<html>test</html>"], "test.html", {
          type: "text/html",
        }),
        status: "uploading",
        progress: 50,
      },
      {
        id: "image-test.png",
        file: new File(["image data"], "test.png", { type: "image/png" }),
        status: "uploading",
        progress: 30,
      },
    ];

    upload.dispatch({
      type: "START_BATCH",
      importId: "debug-import-123",
      createdAt: new Date().toISOString(),
      numberOfFiles: mockFiles.length,
    });

    upload.dispatch({
      type: "ADD_FILES",
      files: mockFiles,
      directoryName: "test-directory",
    });
  };

  const handleSimulateUploadSuccess = () => {
    const mockFiles: FileUploadItem[] = [
      {
        id: "html-success.html",
        file: new File(["<html>success</html>"], "success.html", {
          type: "text/html",
        }),
        status: "completed",
        progress: 100,
      },
      {
        id: "image-success.png",
        file: new File(["image data"], "success.png", { type: "image/png" }),
        status: "completed",
        progress: 100,
      },
    ];

    upload.dispatch({
      type: "START_BATCH",
      importId: "debug-success-456",
      createdAt: new Date().toISOString(),
      numberOfFiles: mockFiles.length,
    });

    upload.dispatch({
      type: "ADD_FILES",
      files: mockFiles,
      directoryName: "success-directory",
    });

    setTimeout(() => {
      upload.dispatch({
        type: "COMPLETE_BATCH",
        successMessage: "Successfully uploaded success.html with 1 images",
      });
    }, 500);
  };

  const handleSimulateUploadError = () => {
    const mockFiles: FileUploadItem[] = [
      {
        id: "html-error.html",
        file: new File(["<html>error</html>"], "error.html", {
          type: "text/html",
        }),
        status: "failed",
        progress: 75,
        error: "Network timeout",
      },
      {
        id: "image-error.png",
        file: new File(["image data"], "error.png", { type: "image/png" }),
        status: "failed",
        progress: 0,
        error: "File too large",
      },
    ];

    upload.dispatch({
      type: "START_BATCH",
      importId: "debug-error-789",
      createdAt: new Date().toISOString(),
      numberOfFiles: mockFiles.length,
    });

    upload.dispatch({
      type: "ADD_FILES",
      files: mockFiles,
      directoryName: "error-directory",
    });

    setTimeout(() => {
      upload.dispatch({
        type: "FAIL_BATCH",
        errorMessage: "Upload failed: Network timeout and file size exceeded",
      });
    }, 500);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="grid gap-6">
        {/* File Upload Section */}
        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">File Upload</h2>
          <ImportFileUpload />
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-xl font-semibold mb-3">Context Status</h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Upload Status:</strong>{" "}
              {upload.state.currentBatch ? (
                <span className="text-blue-600">Active batch</span>
              ) : upload.state.previousBatches.length > 0 ? (
                <span className="text-green-600">Completed</span>
              ) : (
                <span className="text-gray-600">Idle</span>
              )}
            </div>
            {upload.state.currentBatch && (
              <>
                <div>
                  <strong>Import ID:</strong>{" "}
                  <span className="font-mono text-xs">
                    {upload.state.currentBatch.importId}
                  </span>
                </div>
                <div>
                  <strong>Directory:</strong>{" "}
                  <span className="text-muted-foreground">
                    {upload.state.currentBatch.directoryName || "Unknown"}
                  </span>
                </div>
                <div>
                  <strong>Files in Batch:</strong>{" "}
                  <span className="text-muted-foreground">
                    {upload.state.currentBatch.numberOfFiles} files
                  </span>
                </div>
                <div>
                  <strong>File Status:</strong>{" "}
                  <span className="text-muted-foreground">
                    {
                      upload.state.currentBatch.files.filter(
                        (f) => f.status === "completed"
                      ).length
                    }{" "}
                    completed,{" "}
                    {
                      upload.state.currentBatch.files.filter(
                        (f) => f.status === "uploading"
                      ).length
                    }{" "}
                    uploading,{" "}
                    {
                      upload.state.currentBatch.files.filter(
                        (f) => f.status === "failed"
                      ).length
                    }{" "}
                    failed
                  </span>
                </div>
              </>
            )}
            {upload.state.previousBatches.length > 0 && (
              <div>
                <strong>Previous Batches:</strong>{" "}
                <span className="text-muted-foreground">
                  {upload.state.previousBatches.length} completed
                </span>
              </div>
            )}
            <div>
              <strong>WebSocket:</strong>{" "}
              <span
                className={
                  ws.state.status === "connected"
                    ? "text-green-600"
                    : ws.state.status === "error"
                      ? "text-red-600"
                      : "text-yellow-600"
                }
              >
                {ws.state.status}
              </span>
              {ws.state.reconnectionAttempts > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  (attempts: {ws.state.reconnectionAttempts})
                </span>
              )}
            </div>
            <div>
              <strong>Stats:</strong> {stats.state.numberOfNotes} notes,{" "}
              {stats.state.numberOfIngredients} ingredients,{" "}
              {stats.state.numberOfParsingErrors} errors
            </div>
            <div>
              <strong>Activity:</strong> Page {currentPageIndex + 1} of{" "}
              {numPages}, {totalImported} imported
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-xl font-semibold mb-3">Debug Actions</h2>
          {/* File Upload State Testing */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              File Upload States
            </h3>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                onClick={handleSimulateInitialState}
                aria-label="Reset to initial state"
              >
                Initial State
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={handleSimulateUploadingState}
                aria-label="Simulate uploading state"
              >
                Uploading
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                onClick={handleSimulateUploadSuccess}
                aria-label="Simulate successful upload"
              >
                Upload Success
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                onClick={handleSimulateUploadError}
                aria-label="Simulate upload error"
              >
                Upload Error
              </button>
            </div>
          </div>

          {/* Other Debug Actions */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Other Actions
            </h3>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={handleAddNote}
                aria-label="Add a test note to increment the note count"
              >
                Add Note
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={
                  ws.state.status === "connected" ? ws.disconnect : ws.connect
                }
                aria-label={
                  ws.state.status === "connected"
                    ? "Disconnect WebSocket"
                    : "Connect WebSocket"
                }
              >
                {ws.state.status === "connected"
                  ? "Disconnect WS"
                  : "Connect WS"}
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={handleCompleteBatch}
                aria-label="Complete the current test batch"
              >
                Complete Batch
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
