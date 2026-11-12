import { type DbClient, parseOrThrow, toJson } from "./helpers.js";

import {
  type DiscoveryPayload,
  DiscoveryPayloadSchema,
  priorityForDiscovery,
} from "@peas/parser/v2";
import type { DiscoveryStatus, DiscoveryType } from "@prisma/client";

import { prisma } from "../../client.js";

/**
 * Something worth reviewing plus the mentions that show it. `key` deduplicates across runs (one row per type and key).
 *
 * @example
 * {
 *   key: "calamansi juice",
 *   payload: { type: "UNKNOWN_FOOD_PHRASE", phrase: "calamansi juice", headToken: "juice" },
 *   evidence: [{ mentionId: "<m>", noteId: "<note cuid>", spanStart: 14, spanEnd: 29 }],
 * }
 */
export interface DiscoveryCandidate {
  key: string;
  payload: DiscoveryPayload;
  evidence: {
    mentionId: string;
    noteId: string | null;
    spanStart: number;
    spanEnd: number;
  }[];
}

/**
 * Upserts discoveries on (type, key) and their evidence on (discoveryId, mentionId), then recomputes counts and priority from the evidence. Re-running with the same input changes nothing but `lastSeenRevision`.
 *
 * @example
 * await upsertDiscoveries(tx, [candidate], revision) // ["0193..."]
 */
export async function upsertDiscoveries(
  tx: DbClient,
  candidates: readonly DiscoveryCandidate[],
  revision: number
): Promise<string[]> {
  const ids: string[] = [];

  for (const candidate of candidates) {
    const payload = parseOrThrow(
      DiscoveryPayloadSchema,
      candidate.payload,
      "Discovery.payload"
    );
    const discovery = await tx.discovery.upsert({
      where: { type_key: { type: payload.type, key: candidate.key } },
      create: {
        type: payload.type,
        key: candidate.key,
        payload: toJson(payload),
        firstSeenRevision: revision,
        lastSeenRevision: revision,
      },
      update: { payload: toJson(payload), lastSeenRevision: revision },
      select: { id: true, type: true },
    });

    if (candidate.evidence.length > 0) {
      await tx.discoveryEvidence.createMany({
        data: candidate.evidence.map((evidence) => ({
          discoveryId: discovery.id,
          ...evidence,
        })),
        skipDuplicates: true,
      });
    }

    const [mentionCount, notes] = await Promise.all([
      tx.discoveryEvidence.count({ where: { discoveryId: discovery.id } }),
      tx.discoveryEvidence.findMany({
        where: { discoveryId: discovery.id, noteId: { not: null } },
        distinct: ["noteId"],
        select: { noteId: true },
      }),
    ]);
    const distinctNoteCount = notes.length;

    await tx.discovery.update({
      where: { id: discovery.id },
      data: {
        mentionCount,
        distinctNoteCount,
        priority: priorityForDiscovery(discovery.type, {
          distinctNotes: distinctNoteCount,
          mentions: mentionCount,
        }),
      },
    });
    ids.push(discovery.id);
  }

  return ids;
}

export interface DiscoveryQueueItem {
  id: string;
  type: DiscoveryType;
  key: string;
  payload: DiscoveryPayload;
  status: DiscoveryStatus;
  mentionCount: number;
  distinctNoteCount: number;
  priority: number;
}

/**
 * One page of the review queue, highest priority first. Pass `nextCursor` back to get the following page.
 *
 * @example
 * const first = await getDiscoveryQueue({ limit: 25 });
 * const second = await getDiscoveryQueue({ limit: 25, cursor: first.nextCursor });
 */
export async function getDiscoveryQueue(
  {
    type,
    status = "OPEN",
    cursor,
    limit = 25,
  }: {
    type?: DiscoveryType;
    status?: DiscoveryStatus;
    cursor?: string | null;
    limit?: number;
  } = {},
  db: DbClient = prisma
): Promise<{ items: DiscoveryQueueItem[]; nextCursor: string | null }> {
  const rows = await db.discovery.findMany({
    where: { status, ...(type ? { type } : {}) },
    orderBy: [{ priority: "desc" }, { id: "asc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      key: true,
      payload: true,
      status: true,
      mentionCount: true,
      distinctNoteCount: true,
      priority: true,
    },
  });

  const page = rows.slice(0, limit);
  return {
    items: page.map((row) => ({
      ...row,
      payload: parseOrThrow(
        DiscoveryPayloadSchema,
        row.payload,
        "Discovery.payload"
      ),
    })),
    nextCursor:
      rows.length > limit ? (page[page.length - 1]?.id ?? null) : null,
  };
}

export interface DiscoveryDetailRecord extends DiscoveryQueueItem {
  firstSeenRevision: number;
  lastSeenRevision: number;
  resolvedByDecisionId: string | null;
  examples: {
    mentionId: string;
    noteId: string | null;
    rawText: string;
    lineText: string;
    spanStart: number;
    spanEnd: number;
  }[];
}

/**
 * A discovery with example mentions for the review screen.
 *
 * @example
 * const detail = await getDiscoveryDetail(id, { exampleLimit: 5 });
 * // detail.examples -> [{ rawText: "3 tablespoons calamansi juice", lineText: "3 tablespoons calamansi juice", ... }]
 */
export async function getDiscoveryDetail(
  id: string,
  { exampleLimit = 10 }: { exampleLimit?: number } = {},
  db: DbClient = prisma
): Promise<DiscoveryDetailRecord | null> {
  const row = await db.discovery.findUnique({
    where: { id },
    include: {
      evidence: {
        take: exampleLimit,
        orderBy: { mentionId: "asc" },
        include: {
          mention: {
            select: {
              rawText: true,
              parsedLine: { select: { reference: true } },
            },
          },
        },
      },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    type: row.type,
    key: row.key,
    payload: parseOrThrow(
      DiscoveryPayloadSchema,
      row.payload,
      "Discovery.payload"
    ),
    status: row.status,
    mentionCount: row.mentionCount,
    distinctNoteCount: row.distinctNoteCount,
    priority: row.priority,
    firstSeenRevision: row.firstSeenRevision,
    lastSeenRevision: row.lastSeenRevision,
    resolvedByDecisionId: row.resolvedByDecisionId,
    examples: row.evidence.map((evidence) => ({
      mentionId: evidence.mentionId,
      noteId: evidence.noteId,
      rawText: evidence.mention.rawText,
      lineText: evidence.mention.parsedLine.reference,
      spanStart: evidence.spanStart,
      spanEnd: evidence.spanEnd,
    })),
  };
}
