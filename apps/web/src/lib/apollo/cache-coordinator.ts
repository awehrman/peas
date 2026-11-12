import { JobStatusDocument, type JobStatusQuery } from "~/graphql/generated";

import type { ApolloCache, ApolloClient } from "@apollo/client";
import {
  type InvalidationDomain,
  JOB_COMPLETION_DOMAINS,
  type MutationEffect,
  REVISION_SENSITIVE_DOMAINS,
  createMutationEffect,
  mutationEffectSchema,
} from "@peas/api/effects";

/**
 * What each invalidation domain covers in the cache: root Query fields to drop, and entity types to evict (detail views read entities through cache redirects, so dropping the field alone would keep serving them).
 */
export const DOMAIN_CACHE_KEYS: Readonly<
  Record<
    InvalidationDomain,
    { fields: readonly string[]; types: readonly string[] }
  >
> = {
  NOTES: { fields: ["notes"], types: ["NoteSummary"] },
  NOTE_DETAIL: { fields: ["note"], types: ["Note"] },
  RECIPES: { fields: ["recipes"], types: ["RecipeSummary"] },
  RECIPE_DETAIL: { fields: ["recipe"], types: ["Recipe"] },
  RECIPE_TAXONOMY: { fields: ["recipeTaxonomy"], types: [] },
  INGREDIENTS: {
    fields: [
      "ingredients",
      "ingredientCounts",
      "ingredientCategoryNames",
      "searchIngredients",
    ],
    types: ["IngredientSummary"],
  },
  INGREDIENT_DETAIL: { fields: ["ingredient"], types: ["Ingredient"] },
  IMPORT_STATS: { fields: ["importStats"], types: [] },
  DASHBOARD_STATS: { fields: ["dashboardStats"], types: [] },
};

export type JobState = NonNullable<JobStatusQuery["job"]>["status"] | "MISSING";

export interface JobUpdate {
  jobId: string;
  status: JobState;
  errorMessage: string | null;
}

export interface CacheCoordinatorOptions {
  /** Delay between job status polls. */
  jobPollIntervalMs?: number;
  /** Polls before a job that never appears is reported as MISSING. */
  missingJobPolls?: number;
}

export interface CacheCoordinator {
  /** Reconciles the cache with a mutation's effect and resolves once affected active queries have refetched. */
  apply(effect: unknown): Promise<void>;
  /** The newest lexicon revision seen in any effect, or null before one arrives. */
  readonly lexiconRevision: number | null;
  /** Starts polling a background job (also done automatically for `reprocessingJobId`). */
  trackJob(jobId: string): void;
  /** Receives job status changes; returns an unsubscribe function. */
  onJobUpdate(listener: (update: JobUpdate) => void): () => void;
  /** Stops all polling. */
  dispose(): void;
}

const TERMINAL_JOB_STATES: readonly JobState[] = [
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "MISSING",
];

/**
 * The single place that turns mutation effects into cache changes (cache-consistency.md, "Centralized reconciliation"). Components never evict or refetch on their own.
 *
 * 1. Evicts `changed` entities (their cached fields are stale) and `evicted` identities (deleted or merged), then garbage-collects.
 * 2. Drops the root fields and entity types of every invalidated domain.
 * 3. Refetches the active queries those evictions affected; inactive queries simply refetch next time they mount.
 * 4. Records the newest `lexiconRevision`; a newer revision also invalidates the parser-dependent domains.
 * 5. Polls `reprocessingJobId` and, when the job completes, invalidates everything derived from parsing.
 *
 * @example
 * const coordinator = createCacheCoordinator(client);
 * const { data } = await client.mutate({ mutation: UpdateRecipeDocument, variables });
 * await coordinator.apply(data.updateRecipe.effect); // the recipes list and the open recipe refetch
 */
export function createCacheCoordinator(
  client: ApolloClient,
  {
    jobPollIntervalMs = 2000,
    missingJobPolls = 5,
  }: CacheCoordinatorOptions = {}
): CacheCoordinator {
  let lexiconRevision: number | null = null;
  const listeners = new Set<(update: JobUpdate) => void>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let disposed = false;

  function evictEverything(
    cache: ApolloCache,
    effect: MutationEffect,
    domains: ReadonlySet<InvalidationDomain>
  ): void {
    for (const ref of [...effect.changed, ...effect.evicted]) {
      const id = cache.identify({ __typename: ref.typename, id: ref.id });
      if (id) cache.evict({ id });
    }

    const types = new Set<string>();
    for (const domain of domains) {
      for (const fieldName of DOMAIN_CACHE_KEYS[domain].fields)
        cache.evict({ id: "ROOT_QUERY", fieldName });
      for (const type of DOMAIN_CACHE_KEYS[domain].types) types.add(type);
    }
    if (types.size > 0) {
      for (const key of Object.keys(
        cache.extract() as Record<string, unknown>
      )) {
        const separator = key.indexOf(":");
        if (separator > 0 && types.has(key.slice(0, separator)))
          cache.evict({ id: key });
      }
    }
    cache.gc();
  }

  async function reconcile(effect: MutationEffect): Promise<void> {
    const domains = new Set(effect.invalidatedDomains);

    if (effect.lexiconRevision !== null) {
      const previous = lexiconRevision;
      if (previous === null || effect.lexiconRevision > previous) {
        lexiconRevision = effect.lexiconRevision;
        if (previous !== null)
          for (const domain of REVISION_SENSITIVE_DOMAINS) domains.add(domain);
      }
    }

    if (
      effect.changed.length > 0 ||
      effect.evicted.length > 0 ||
      domains.size > 0
    ) {
      await client.refetchQueries({
        updateCache: (cache) => evictEverything(cache, effect, domains),
      });
    }

    if (effect.reprocessingJobId) trackJob(effect.reprocessingJobId);
  }

  function notify(update: JobUpdate): void {
    for (const listener of listeners) listener(update);
  }

  function trackJob(jobId: string): void {
    if (disposed || timers.has(jobId)) return;
    let misses = 0;

    const poll = async (): Promise<void> => {
      timers.delete(jobId);
      if (disposed) return;

      let update: JobUpdate;
      try {
        const { data } = await client.query({
          query: JobStatusDocument,
          variables: { jobId },
          fetchPolicy: "network-only",
        });
        const job = data?.job;
        if (job) {
          update = {
            jobId,
            status: job.status,
            errorMessage: job.errorMessage ?? null,
          };
        } else {
          misses += 1;
          update = {
            jobId,
            status: misses >= missingJobPolls ? "MISSING" : "PENDING",
            errorMessage: null,
          };
        }
      } catch (error) {
        update = {
          jobId,
          status: "PENDING",
          errorMessage: error instanceof Error ? error.message : String(error),
        };
      }

      notify(update);
      if (update.status === "COMPLETED") {
        await reconcile(
          createMutationEffect({
            invalidatedDomains: [...JOB_COMPLETION_DOMAINS],
          })
        );
        return;
      }
      if (TERMINAL_JOB_STATES.includes(update.status) || disposed) return;
      timers.set(
        jobId,
        setTimeout(() => void poll(), jobPollIntervalMs)
      );
    };

    timers.set(
      jobId,
      setTimeout(() => void poll(), 0)
    );
  }

  return {
    async apply(raw) {
      const parsed = mutationEffectSchema.safeParse(raw);
      if (!parsed.success) {
        // A malformed effect means we cannot tell what changed; refetching every active query is the safe fallback.
        console.warn("Ignoring malformed mutation effect", parsed.error.issues);
        await client.refetchQueries({ include: "active" });
        return;
      }
      await reconcile(parsed.data);
    },
    get lexiconRevision() {
      return lexiconRevision;
    },
    trackJob,
    onJobUpdate(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      disposed = true;
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      listeners.clear();
    },
  };
}
