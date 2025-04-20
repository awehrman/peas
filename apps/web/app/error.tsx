"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@peas/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="text-4xl font-bold text-red-600 dark:text-red-500 mb-4">
        Something went wrong!
      </h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
        {error.message || "An unexpected error occurred"}
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={reset}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors"
        >
          Try again
        </Button>
        <Link
          href="/"
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}
