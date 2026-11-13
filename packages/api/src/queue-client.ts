import { createQueueToken } from "./auth/queue-token";

const DEFAULT_QUEUE_URL = "http://localhost:4200";
const QUEUE_TIMEOUT_MS = 5_000;

/** Where the server reaches the queue service; the browser's NEXT_PUBLIC_* upload URL is not used here. */
export function queueUrl(): string {
  return (process.env.QUEUE_INTERNAL_URL ?? DEFAULT_QUEUE_URL).replace(
    /\/$/,
    ""
  );
}

/**
 * POSTs JSON to the queue service as the given user (HMAC token from QUEUE_AUTH_SECRET). Throws when the queue is unreachable or answers with an error.
 *
 * @example
 * await postToQueue("/reinterpret", { revision: 15, phrases: ["icing sugar"], conceptIds: [] }, userId) // { success: true, jobId: "reinterpret-15", status: "PENDING" }
 */
export async function postToQueue<TResponse>(
  path: string,
  body: unknown,
  userId: string,
  fetchImpl: typeof fetch = fetch
): Promise<TResponse> {
  const response = await fetchImpl(`${queueUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${createQueueToken(userId)}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(QUEUE_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`The queue answered ${response.status} for ${path}`);
  }
  return (await response.json()) as TResponse;
}

/** The queue's live parse window (GET /metrics/ingredients `data.live`). */
export interface LiveParseMetrics {
  windowSeconds: number;
  lineCount: number;
  linesPerSecond: number;
  structuralSuccessShare: number | null;
  averageCandidatesPerSegment: number | null;
  unknownTokens: number;
  lexiconRevision: number | null;
}

/**
 * The queue's last hour of parses, or null when the queue is unreachable or answers with an error; the corpus health card still shows database counts.
 *
 * @example
 * await fetchLiveParseMetrics(userId) // { lineCount: 1200, linesPerSecond: 0.33, structuralSuccessShare: 0.97, ... }
 */
export async function fetchLiveParseMetrics(
  userId: string,
  fetchImpl: typeof fetch = fetch
): Promise<LiveParseMetrics | null> {
  try {
    const response = await fetchImpl(`${queueUrl()}/metrics/ingredients`, {
      headers: { Authorization: `Bearer ${createQueueToken(userId)}` },
      signal: AbortSignal.timeout(QUEUE_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      data?: { live?: LiveParseMetrics };
    };
    return body.data?.live ?? null;
  } catch {
    return null;
  }
}

/**
 * Hands a decision's large reinterpretation to the queue (Phase 5f) and returns the run's job id, which the web app polls through `Query.job`.
 *
 * @example
 * await requestBackgroundReinterpret(15, { phrases: ["icing sugar"], conceptIds: [] }, userId) // "reinterpret-15"
 */
export async function requestBackgroundReinterpret(
  revision: number,
  scope: { phrases: readonly string[]; conceptIds: readonly string[] },
  userId: string,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const response = await postToQueue<{ jobId: string }>(
    "/reinterpret",
    { revision, phrases: scope.phrases, conceptIds: scope.conceptIds },
    userId,
    fetchImpl
  );
  return response.jobId;
}

/** Tells the queue to reload its resolver context now instead of after its TTL. Failures are ignored: the TTL still applies. */
export async function notifyLexiconRevision(
  revision: number,
  userId: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  await postToQueue(
    "/reinterpret/lexicon-revision",
    { revision },
    userId,
    fetchImpl
  ).catch(() => undefined);
}
