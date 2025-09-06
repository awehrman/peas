"use client";

import { useActivityDerived } from "../context/activity/selectors";
import { useImport } from "../hooks/use-import";
import { useInitialization } from "../hooks/use-initialization";

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
    enableDemoInit: true,
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

  return (
    <div className="container mx-auto p-6">
      <div className="grid gap-6">
        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-xl font-semibold mb-3">Context Status</h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Upload:</strong>{" "}
              {upload.state.currentBatch ? "Active batch" : "No active batch"}
              {upload.state.currentBatch && (
                <span className="ml-2 text-muted-foreground">
                  ({upload.state.currentBatch.numberOfFiles} files)
                </span>
              )}
            </div>
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
              {ws.state.status === "connected" ? "Disconnect WS" : "Connect WS"}
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
  );
}
