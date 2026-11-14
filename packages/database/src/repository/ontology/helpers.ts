import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import type { z } from "zod";

/** A transaction or the root client. Write functions take one explicitly; reads default to the shared client. */
export type DbClient = Prisma.TransactionClient;

/** A rule of the ontology was broken (cycle, duplicate, missing target). Callers show the message. */
export class OntologyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OntologyError";
  }
}

/**
 * The only place that recognizes unique-constraint violations, so a Prisma upgrade changes one function.
 *
 * @example
 * try { await tx.attributeValue.create(...) } catch (error) { if (isUniqueViolation(error)) throw new OntologyError("Already exists"); throw error; }
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export type LexiconTargetRole =
  | "FOOD"
  | "ATTRIBUTE"
  | "PREPARATION"
  | "DEGREE"
  | "MEASUREMENT_MODIFIER"
  | "INSTRUCTION";

export interface LexiconTarget {
  role: LexiconTargetRole;
  conceptId?: string | null;
  attributeValueId?: string | null;
  preparationId?: string | null;
  valueKey?: string | null;
}

/**
 * The uniqueness key for what an entry points at (decision D4). Entries are unique per (matchKey, targetKey), so "green" can be both color=green and ripeness=unripe but not color=green twice.
 *
 * @example
 * computeTargetKey({ role: "FOOD", conceptId: "0193..." })            // "food:0193..."
 * computeTargetKey({ role: "ATTRIBUTE", attributeValueId: "0193..." }) // "attr:0193..."
 * computeTargetKey({ role: "PREPARATION", preparationId: "0193..." })  // "prep:0193..."
 * computeTargetKey({ role: "DEGREE", valueKey: "fine" })               // "degree:fine"
 */
export function computeTargetKey(target: LexiconTarget): string {
  switch (target.role) {
    case "FOOD":
      return `food:${requireTarget(target.conceptId, "FOOD entries need a conceptId")}`;
    case "ATTRIBUTE":
      return `attr:${requireTarget(target.attributeValueId, "ATTRIBUTE entries need an attributeValueId")}`;
    case "PREPARATION":
      return `prep:${requireTarget(target.preparationId, "PREPARATION entries need a preparationId")}`;
    case "DEGREE":
    case "MEASUREMENT_MODIFIER":
    case "INSTRUCTION":
      return `${target.role.toLowerCase()}:${requireTarget(target.valueKey, `${target.role} entries need a valueKey`)}`;
  }
}

function requireTarget(
  value: string | null | undefined,
  message: string
): string {
  if (!value) throw new OntologyError(message);
  return value;
}

/**
 * URL-safe slug for a concept name. Accents are folded, "&" becomes "and", everything else non-alphanumeric becomes a single hyphen.
 *
 * @example
 * slugify("Granny Smith Apple") // "granny-smith-apple"
 * slugify("Crème Fraîche")      // "creme-fraiche"
 * slugify("Salt & Pepper")      // "salt-and-pepper"
 */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "concept";
}

/**
 * Picks the first free slug: the base, then base-2, base-3, ...
 *
 * @example
 * nextFreeSlug("apple", ["apple", "apple-2"]) // "apple-3"
 */
export function nextFreeSlug(base: string, taken: readonly string[]): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let suffix = 2; ; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
}

/**
 * A time-ordered UUID (RFC 9562 version 7), for ids that must exist before their row is inserted (a decision id goes into its revision's reason). Columns otherwise get uuid(7) defaults from Prisma.
 *
 * @example
 * uuidv7() // "0193a5f2-7c1e-7b3a-9f4d-2e8c1a6b0d57"
 */
export function uuidv7(now: number = Date.now()): string {
  const bytes = randomBytes(16);
  let timestamp = BigInt(now);
  for (let index = 5; index >= 0; index--) {
    bytes[index] = Number(timestamp & 0xffn);
    timestamp >>= 8n;
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Validates a JSON column on write or read. Throws an OntologyError naming the column, so bad payloads never reach the database or the UI.
 *
 * @example
 * const payload = parseOrThrow(DiscoveryPayloadSchema, row.payload, "Discovery.payload");
 */
export function parseOrThrow<Schema extends z.ZodType>(
  schema: Schema,
  value: unknown,
  label: string
): z.infer<Schema> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.length ? ` at ${issue.path.join(".")}` : "";
    throw new OntologyError(
      `Invalid ${label}${path}: ${issue?.message ?? "unknown error"}`
    );
  }
  return result.data;
}

/** Converts a validated value into Prisma's JSON input type. */
export function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
