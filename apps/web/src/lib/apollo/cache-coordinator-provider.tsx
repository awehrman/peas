import {
  type CacheCoordinator,
  createCacheCoordinator,
} from "./cache-coordinator";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

import type { OperationVariables, TypedDocumentNode } from "@apollo/client";
import { useApolloClient } from "@apollo/client/react";
import type { MutationAction, MutationResult } from "@peas/features";

const CacheCoordinatorContext = createContext<CacheCoordinator | null>(null);

/** One coordinator per Apollo client (one per request on the server, one per tab in the browser). */
export function CacheCoordinatorProvider({
  children,
}: {
  children: ReactNode;
}) {
  const client = useApolloClient();
  const coordinator = useMemo(() => createCacheCoordinator(client), [client]);
  useEffect(() => {
    // React can clean up and re-run this effect on the same memoized instance (StrictMode, dev remounts)
    coordinator.resume();
    return () => coordinator.dispose();
  }, [coordinator]);
  return (
    <CacheCoordinatorContext.Provider value={coordinator}>
      {children}
    </CacheCoordinatorContext.Provider>
  );
}

export function useCacheCoordinator(): CacheCoordinator {
  const coordinator = useContext(CacheCoordinatorContext);
  if (!coordinator)
    throw new Error(
      "useCacheCoordinator must be used inside CacheCoordinatorProvider"
    );
  return coordinator;
}

/** The fields every mutation payload shares (GraphQL interface MutationPayload). */
export interface PayloadFields {
  success: boolean;
  message?: string | null;
  effect: unknown;
}

export interface MutationActionOptions<
  TData,
  TVariables,
  TArgs extends unknown[],
  TResult,
> {
  /** Builds GraphQL variables from the feature component's arguments. */
  variables: (...args: TArgs) => TVariables;
  /** Picks the payload out of the mutation result. */
  payload: (data: TData) => PayloadFields | null | undefined;
  /** Maps a successful payload to the data the feature component expects. */
  result?: (data: TData) => TResult;
}

/**
 * Adapts a GraphQL mutation to the `MutationAction` signature the @peas/features components already use, and routes every effect through the cache coordinator. Expected failures come back as `{ success: false, message }`; network and GraphQL errors do too.
 *
 * @example
 * const onUpdate = useMutationAction(UpdateRecipeDocument, {
 *   variables: (input: RecipeUpdateInput) => ({ input }),
 *   payload: (data) => data.updateRecipe,
 * });
 * <RecipeDetailPageContent recipe={recipe} onUpdate={onUpdate} />
 */
export function useMutationAction<
  TData,
  TVariables extends OperationVariables,
  TArgs extends unknown[],
  TResult = undefined,
>(
  mutation: TypedDocumentNode<TData, TVariables>,
  options: MutationActionOptions<TData, TVariables, TArgs, TResult>
): MutationAction<TArgs, TResult> {
  const client = useApolloClient();
  const coordinator = useCacheCoordinator();
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  return useCallback(
    async (...args: TArgs): Promise<MutationResult<TResult>> => {
      const { variables, payload, result } = optionsRef.current;
      try {
        const response = await client.mutate<TData, TVariables>({
          mutation,
          variables: variables(...args),
        });
        const data = response.data;
        const fields = data ? payload(data) : null;
        if (!data || !fields)
          return { success: false, message: "The server returned no result" };
        if (!fields.success)
          return {
            success: false,
            message: fields.message ?? "Something went wrong",
          };

        await coordinator.apply(fields.effect);
        return {
          success: true,
          ...(fields.message ? { message: fields.message } : {}),
          ...(result ? { data: result(data) } : {}),
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Something went wrong",
        };
      }
    },
    [client, coordinator, mutation]
  );
}
