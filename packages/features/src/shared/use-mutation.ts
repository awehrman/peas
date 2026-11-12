"use client";

import { useCallback, useState, useTransition } from "react";

import type { MutationAction, MutationResult } from "./mutation-result";

interface UseMutationValue<TArgs extends unknown[], TData> {
  run: (...args: TArgs) => Promise<MutationResult<TData>>;
  isPending: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Runs a server action inside a transition and keeps its pending/error state.
 * Never throws: thrown errors come back as failed results.
 */
export function useMutation<TArgs extends unknown[], TData = undefined>(
  action: MutationAction<TArgs, TData> | undefined
): UseMutationValue<TArgs, TData> {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    (...args: TArgs) =>
      new Promise<MutationResult<TData>>((resolve) => {
        if (!action) {
          const result = {
            success: false as const,
            message: "This action is not available",
          };
          setError(result.message);
          resolve(result);
          return;
        }

        setError(null);
        startTransition(async () => {
          try {
            const result = await action(...args);
            if (!result.success) setError(result.message);
            resolve(result);
          } catch (caught) {
            const message =
              caught instanceof Error ? caught.message : "Something went wrong";
            setError(message);
            resolve({ success: false, message });
          }
        });
      }),
    [action]
  );

  const clearError = useCallback(() => setError(null), []);

  return { run, isPending, error, clearError };
}
