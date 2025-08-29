"use client";

import { ReactNode, useState } from "react";

import { Button } from "@peas/components";

import { cleanupAllDataAction } from "../actions/cleanup";

export function DashboardPageContent(): ReactNode {
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{
    success: boolean;
    message: string;
    deletedCounts?: Record<string, number>;
  } | null>(null);

  const handleCleanupAll = async () => {
    setIsCleaning(true);
    setCleanupResult(null);

    try {
      const result = await cleanupAllDataAction();

      setCleanupResult({
        success: result.success,
        message: result.message,
        deletedCounts: result.deletedCounts,
      });
    } catch (error) {
      setCleanupResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6 md:w-1/3">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Database Management
        </h2>

        <div className="space-y-4">
          <Button
            onClick={handleCleanupAll}
            disabled={isCleaning}
            variant="destructive"
            className="sm:w-auto"
          >
            {isCleaning ? "🧹 Cleaning..." : "🗑️ Delete All Data"}
          </Button>

          {cleanupResult && (
            <div
              className={`border-l-4 p-4 max-w-full overflow-hidden ${
                cleanupResult.success
                  ? "border-green-500 bg-green-50"
                  : "border-red-500 bg-red-50"
              }`}
            >
              <h4
                className={`font-medium mb-2 ${
                  cleanupResult.success ? "text-green-800" : "text-red-800"
                }`}
              >
                {cleanupResult.success
                  ? "✅ Cleanup Result"
                  : "❌ Cleanup Failed"}
              </h4>
              <p
                className={`${
                  cleanupResult.success ? "text-green-700" : "text-red-700"
                } break-words`}
              >
                {cleanupResult.message}
              </p>

              {cleanupResult.deletedCounts && (
                <div className="mt-3 text-sm max-w-full overflow-hidden">
                  <h5 className="font-medium mb-1">Deleted Records:</h5>
                  <ul className="space-y-1">
                    {Object.entries(cleanupResult.deletedCounts).map(
                      ([key, count]) => (
                        <li key={key} className="flex justify-between">
                          <span className="capitalize truncate">
                            {key.replace(/([A-Z])/g, " $1").trim()}:
                          </span>
                          <span className="font-mono ml-2 flex-shrink-0">
                            {count}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
