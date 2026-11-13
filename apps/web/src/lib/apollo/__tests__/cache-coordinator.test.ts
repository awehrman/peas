import {
  ImportStatsDocument,
  NoteDetailDocument,
  NotesPageDocument,
  RecipeDetailDocument,
} from "~/graphql/generated";

import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  type TypedDocumentNode,
} from "@apollo/client";
import { createMutationEffect } from "@peas/api/effects";
import { of } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cacheConfig } from "../cache-config";
import { type JobUpdate, createCacheCoordinator } from "../cache-coordinator";

type Handler = (
  variables: Record<string, unknown>,
  call: number
) => Record<string, unknown>;

/** A scripted link: answers each operation by name and counts calls per operation. */
function createTestClient(handlers: Record<string, Handler>) {
  const calls: Record<string, number> = {};
  const link = new ApolloLink((operation) => {
    const name = operation.operationName ?? "anonymous";
    calls[name] = (calls[name] ?? 0) + 1;
    const handler = handlers[name];
    if (!handler) throw new Error(`No handler for ${name}`);
    return of({ data: handler(operation.variables, calls[name]) });
  });
  const client = new ApolloClient({
    cache: new InMemoryCache(cacheConfig),
    link,
  });
  return { client, calls };
}

/** Subscribes to a query so it counts as active, resolving once data arrives. */
async function watch<TData, TVariables extends Record<string, unknown>>(
  client: ApolloClient,
  query: TypedDocumentNode<TData, TVariables>,
  variables: TVariables
): Promise<{ latest: () => TData | undefined; stop: () => void }> {
  let latest: TData | undefined;
  let resolveFirst: () => void = () => undefined;
  const firstData = new Promise<void>((resolve) => {
    resolveFirst = resolve;
  });
  const subscription = client
    .watchQuery({ query, variables })
    .subscribe((result) => {
      if (result.data && result.dataState === "complete") {
        latest = result.data as TData;
        resolveFirst();
      }
    });
  await firstData;
  return { latest: () => latest, stop: () => subscription.unsubscribe() };
}

async function eventually(
  assertion: () => void,
  timeoutMs = 1000
): Promise<void> {
  const started = Date.now();
  for (;;) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() - started > timeoutMs) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

const notesPage = () => ({
  notes: {
    __typename: "NotesPage",
    items: [
      {
        __typename: "NoteSummary",
        id: "n1",
        title: "Chili",
        status: "COMPLETED",
        duplicateConfidence: null,
        parsingErrorCount: 0,
        ingredientLineCount: 3,
        instructionLineCount: 1,
        thumbnailUrl: null,
        notebook: null,
        recipeId: null,
        createdAt: "2026-11-12T00:00:00.000Z",
      },
    ],
    total: 1,
    page: 1,
    pageSize: 25,
  },
});

const noteDetail = (title = "Chili") => ({
  note: {
    __typename: "Note",
    id: "n1",
    title,
    status: "COMPLETED",
    createdAt: "2026-11-12T00:00:00.000Z",
    errorMessage: null,
    duplicateConfidence: null,
    parsingErrorCount: 0,
    evernote: null,
    images: [],
    sources: [],
    categories: [],
    tags: [],
    ingredientBlocks: [],
    instructions: [],
    recipeId: null,
  },
});

const recipeDetail = (title: string) => ({
  recipe: {
    __typename: "Recipe",
    id: "r1",
    title,
    noteId: "n1",
    imageUrl: null,
    categories: [],
    tags: [],
    sources: [],
    ingredientBlocks: [],
    instructions: [],
    createdAt: "2026-11-12T00:00:00.000Z",
  },
});

describe("cache coordinator", () => {
  afterEach(() => vi.restoreAllMocks());

  it("evicts changed entities so the views showing them refetch", async () => {
    const { client, calls } = createTestClient({
      RecipeDetail: (_variables, call) =>
        recipeDetail(call === 1 ? "Chili" : "Chili, renamed"),
    });
    const coordinator = createCacheCoordinator(client);
    const view = await watch(client, RecipeDetailDocument, { id: "r1" });

    await coordinator.apply(
      createMutationEffect({ changed: [{ typename: "Recipe", id: "r1" }] })
    );

    expect(calls.RecipeDetail).toBe(2);
    await eventually(() =>
      expect(view.latest()?.recipe?.title).toBe("Chili, renamed")
    );
    view.stop();
  });

  it("refetches active queries in invalidated domains and drops inactive ones", async () => {
    const { client, calls } = createTestClient({
      NotesPage: notesPage,
      NoteDetail: () => noteDetail(),
    });
    const coordinator = createCacheCoordinator(client);
    const list = await watch(client, NotesPageDocument, {
      status: null,
      query: null,
      page: 1,
    });
    await client.query({ query: NoteDetailDocument, variables: { id: "n1" } });

    await coordinator.apply(
      createMutationEffect({ invalidatedDomains: ["NOTES", "NOTE_DETAIL"] })
    );

    expect(calls.NotesPage).toBe(2);
    expect(calls.NoteDetail).toBe(1);
    expect(
      client.cache.readQuery({
        query: NoteDetailDocument,
        variables: { id: "n1" },
      })
    ).toBeNull();
    list.stop();
  });

  it("leaves queries outside the invalidated domains alone", async () => {
    const { client, calls } = createTestClient({
      NotesPage: notesPage,
      RecipeDetail: () => recipeDetail("Chili"),
    });
    const coordinator = createCacheCoordinator(client);
    const list = await watch(client, NotesPageDocument, {
      status: null,
      query: null,
      page: 1,
    });
    const recipe = await watch(client, RecipeDetailDocument, { id: "r1" });

    await coordinator.apply(
      createMutationEffect({
        invalidatedDomains: ["RECIPES", "RECIPE_TAXONOMY"],
      })
    );

    expect(calls.NotesPage).toBe(1);
    expect(calls.RecipeDetail).toBe(1);
    list.stop();
    recipe.stop();
  });

  it("refreshes a domain's active queries while their data stays on screen", async () => {
    const { client, calls } = createTestClient({
      ImportStats: (_variables, call) => ({
        importStats: {
          __typename: "ImportStats",
          numberOfNotes: call === 1 ? 10 : 11,
          numberOfIngredients: 40,
          numberOfParsingErrors: 0,
        },
      }),
      NotesPage: notesPage,
    });
    const coordinator = createCacheCoordinator(client);
    const emissions: { dataState: string; notes?: number }[] = [];
    let resolveFirst: () => void = () => undefined;
    const firstData = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const subscription = client
      .watchQuery({ query: ImportStatsDocument })
      .subscribe((result) => {
        emissions.push({
          dataState: result.dataState,
          notes: result.data?.importStats?.numberOfNotes,
        });
        if (result.dataState === "complete") resolveFirst();
      });
    await firstData;
    const list = await watch(client, NotesPageDocument, {
      status: null,
      query: null,
      page: 1,
    });

    await coordinator.refresh(["IMPORT_STATS"]);

    expect(calls.ImportStats).toBe(2);
    expect(calls.NotesPage).toBe(1);
    await eventually(() => expect(emissions.at(-1)?.notes).toBe(11));
    const afterFirst = emissions.slice(
      emissions.findIndex((emission) => emission.dataState === "complete")
    );
    expect(afterFirst.every((emission) => emission.notes !== undefined)).toBe(true);
    subscription.unsubscribe();
    list.stop();
  });

  it("refetches every active query when an effect is malformed", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { client, calls } = createTestClient({
      NotesPage: notesPage,
      RecipeDetail: () => recipeDetail("Chili"),
    });
    const coordinator = createCacheCoordinator(client);
    const list = await watch(client, NotesPageDocument, {
      status: null,
      query: null,
      page: 1,
    });
    const recipe = await watch(client, RecipeDetailDocument, { id: "r1" });

    await coordinator.apply({ invalidatedDomains: ["NOT_A_DOMAIN"] });

    expect(calls.NotesPage).toBe(2);
    expect(calls.RecipeDetail).toBe(2);
    list.stop();
    recipe.stop();
  });

  it("invalidates parser-dependent views only when the lexicon revision moves forward", async () => {
    const { client, calls } = createTestClient({
      NoteDetail: () => noteDetail(),
    });
    const coordinator = createCacheCoordinator(client);
    const note = await watch(client, NoteDetailDocument, { id: "n1" });

    await coordinator.apply(createMutationEffect({ lexiconRevision: 3 }));
    expect(calls.NoteDetail).toBe(1);
    expect(coordinator.lexiconRevision).toBe(3);

    await coordinator.apply(createMutationEffect({ lexiconRevision: 4 }));
    expect(calls.NoteDetail).toBe(2);

    await coordinator.apply(createMutationEffect({ lexiconRevision: 2 }));
    expect(calls.NoteDetail).toBe(2);
    expect(coordinator.lexiconRevision).toBe(4);
    note.stop();
  });

  it("polls a reprocessing job until it completes, then refreshes parse-derived views", async () => {
    const statuses = ["PROCESSING", "COMPLETED"];
    const { client, calls } = createTestClient({
      NotesPage: notesPage,
      JobStatus: (_variables, call) => ({
        job: {
          __typename: "Job",
          jobId: "job-1",
          type: "PROCESS_NOTE",
          status: statuses[Math.min(call - 1, statuses.length - 1)],
          noteId: "n1",
          processedCount: null,
          totalCount: null,
          errorMessage: null,
          retryCount: 0,
          startedAt: null,
          completedAt: null,
        },
      }),
    });
    const coordinator = createCacheCoordinator(client, {
      jobPollIntervalMs: 5,
    });
    const updates: JobUpdate[] = [];
    coordinator.onJobUpdate((update) => updates.push(update));
    const list = await watch(client, NotesPageDocument, {
      status: null,
      query: null,
      page: 1,
    });

    await coordinator.apply(
      createMutationEffect({ reprocessingJobId: "job-1" })
    );

    await eventually(() =>
      expect(updates.map((update) => update.status)).toEqual([
        "PROCESSING",
        "COMPLETED",
      ])
    );
    await eventually(() => expect(calls.NotesPage).toBe(2));
    coordinator.dispose();
    list.stop();
  });

  it("reports a failed job without invalidating anything", async () => {
    const { client, calls } = createTestClient({
      NotesPage: notesPage,
      JobStatus: () => ({
        job: {
          __typename: "Job",
          jobId: "job-2",
          type: "PROCESS_NOTE",
          status: "FAILED",
          noteId: "n1",
          processedCount: null,
          totalCount: null,
          errorMessage: "Parser crashed",
          retryCount: 3,
          startedAt: null,
          completedAt: null,
        },
      }),
    });
    const coordinator = createCacheCoordinator(client, {
      jobPollIntervalMs: 5,
    });
    const updates: JobUpdate[] = [];
    coordinator.onJobUpdate((update) => updates.push(update));
    const list = await watch(client, NotesPageDocument, {
      status: null,
      query: null,
      page: 1,
    });

    coordinator.trackJob("job-2");

    await eventually(() =>
      expect(updates).toEqual([
        {
          jobId: "job-2",
          status: "FAILED",
          errorMessage: "Parser crashed",
          processedCount: null,
          totalCount: null,
        },
      ])
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(calls.JobStatus).toBe(1);
    expect(calls.NotesPage).toBe(1);
    coordinator.dispose();
    list.stop();
  });

  it("tracks jobs again after an effect disposes and resumes the same coordinator", async () => {
    const { client, calls } = createTestClient({
      JobStatus: () => ({
        job: {
          __typename: "Job",
          jobId: "reinterpret-16",
          type: "REINTERPRET",
          status: "COMPLETED",
          noteId: null,
          processedCount: 10,
          totalCount: 10,
          errorMessage: null,
          retryCount: 0,
          startedAt: null,
          completedAt: null,
        },
      }),
    });
    const coordinator = createCacheCoordinator(client, {
      jobPollIntervalMs: 5,
    });
    coordinator.dispose();
    coordinator.trackJob("reinterpret-16");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls.JobStatus ?? 0).toBe(0);

    coordinator.resume();
    const updates: JobUpdate[] = [];
    coordinator.onJobUpdate((update) => updates.push(update));
    await coordinator.apply(
      createMutationEffect({ reprocessingJobId: "reinterpret-16" })
    );
    await eventually(() =>
      expect(updates.map((update) => update.status)).toEqual(["COMPLETED"])
    );
    coordinator.dispose();
  });

  it("passes on reinterpretation progress counts", async () => {
    const counts = [400, 1200];
    const { client } = createTestClient({
      JobStatus: (_variables, call) => ({
        job: {
          __typename: "Job",
          jobId: "reinterpret-15",
          type: "REINTERPRET",
          status: call === 1 ? "PROCESSING" : "COMPLETED",
          noteId: null,
          processedCount: counts[Math.min(call - 1, 1)],
          totalCount: 1200,
          errorMessage: null,
          retryCount: 0,
          startedAt: null,
          completedAt: null,
        },
      }),
    });
    const coordinator = createCacheCoordinator(client, {
      jobPollIntervalMs: 5,
    });
    const updates: JobUpdate[] = [];
    coordinator.onJobUpdate((update) => updates.push(update));

    await coordinator.apply(
      createMutationEffect({ reprocessingJobId: "reinterpret-15" })
    );

    await eventually(() =>
      expect(
        updates.map(({ status, processedCount, totalCount }) => [
          status,
          processedCount,
          totalCount,
        ])
      ).toEqual([
        ["PROCESSING", 400, 1200],
        ["COMPLETED", 1200, 1200],
      ])
    );
    coordinator.dispose();
  });
});
