import { createHash } from "crypto";

import type { ActiveParser, GrammarRuleDefinitionType, Prisma } from "@prisma/client";

import { prisma } from "../client.js";

// ============================================================================
// RULES
// ============================================================================

export interface GrammarRuleDefinitionRecord {
  id: string;
  type: GrammarRuleDefinitionType;
  order: number;
  example: string;
  rule: string;
  formatter: string;
  list: string[];
}

export interface GrammarRuleRecord {
  id: string;
  name: string;
  label: string;
  order: number;
  definitions: GrammarRuleDefinitionRecord[];
}

export interface GrammarRuleDefinitionWriteInput {
  type: GrammarRuleDefinitionType;
  example: string;
  rule: string;
  formatter: string;
  list: string[];
}

export interface GrammarRuleWriteInput {
  name: string;
  label: string;
  definitions: GrammarRuleDefinitionWriteInput[];
}

const ruleInclude = {
  definitions: { orderBy: { order: "asc" } },
} satisfies Prisma.GrammarRuleInclude;

type GrammarRuleWithDefinitions = Prisma.GrammarRuleGetPayload<{
  include: typeof ruleInclude;
}>;

function toRuleRecord(rule: GrammarRuleWithDefinitions): GrammarRuleRecord {
  return {
    id: rule.id,
    name: rule.name,
    label: rule.label,
    order: rule.order,
    definitions: rule.definitions.map((definition) => ({
      id: definition.id,
      type: definition.type,
      order: definition.order,
      example: definition.example,
      rule: definition.rule,
      formatter: definition.formatter,
      list: definition.list,
    })),
  };
}

function toDefinitionCreates(definitions: GrammarRuleDefinitionWriteInput[]) {
  return definitions.map((definition, order) => ({ ...definition, order }));
}

async function assertRuleNameAvailable(name: string, excludeId?: string) {
  const existing = await prisma.grammarRule.findFirst({
    where: { name, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) throw new Error(`A rule named "${name}" already exists`);
}

export async function getGrammarRules(): Promise<GrammarRuleRecord[]> {
  const rules = await prisma.grammarRule.findMany({
    orderBy: { order: "asc" },
    include: ruleInclude,
  });
  return rules.map(toRuleRecord);
}

export async function createGrammarRule(
  input: GrammarRuleWriteInput
): Promise<GrammarRuleRecord> {
  await assertRuleNameAvailable(input.name);
  const last = await prisma.grammarRule.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const rule = await prisma.grammarRule.create({
    data: {
      name: input.name,
      label: input.label,
      order: (last?.order ?? -1) + 1,
      definitions: { create: toDefinitionCreates(input.definitions) },
    },
    include: ruleInclude,
  });
  return toRuleRecord(rule);
}

/**
 * Replaces the rule's fields and definitions wholesale, so definitions
 * removed in the editor are deleted.
 */
export async function updateGrammarRule(
  id: string,
  input: GrammarRuleWriteInput
): Promise<GrammarRuleRecord> {
  await assertRuleNameAvailable(input.name, id);

  const rule = await prisma.$transaction(async (tx) => {
    await tx.grammarRuleDefinition.deleteMany({ where: { grammarRuleId: id } });
    return tx.grammarRule.update({
      where: { id },
      data: {
        name: input.name,
        label: input.label,
        definitions: { create: toDefinitionCreates(input.definitions) },
      },
      include: ruleInclude,
    });
  });
  return toRuleRecord(rule);
}

export async function deleteGrammarRule(id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.grammarRule.delete({ where: { id } });
    const remaining = await tx.grammarRule.findMany({
      orderBy: { order: "asc" },
      select: { id: true },
    });
    await Promise.all(
      remaining.map((rule, order) =>
        tx.grammarRule.update({ where: { id: rule.id }, data: { order } })
      )
    );
  });
}

/**
 * Saves a new rule order. `orderedIds` must contain every rule id.
 */
export async function reorderGrammarRules(orderedIds: string[]): Promise<void> {
  const count = await prisma.grammarRule.count({ where: { id: { in: orderedIds } } });
  if (count !== orderedIds.length || new Set(orderedIds).size !== orderedIds.length) {
    throw new Error("The rule order is out of date; reload and try again");
  }

  await prisma.$transaction(
    orderedIds.map((id, order) =>
      prisma.grammarRule.update({ where: { id }, data: { order } })
    )
  );
}

export async function resetGrammarRules(): Promise<{ deleted: number }> {
  const result = await prisma.grammarRule.deleteMany({});
  return { deleted: result.count };
}

/**
 * Adds any seed rules whose names don't exist yet, after the current rules.
 */
export async function seedGrammarRules(
  rules: (GrammarRuleWriteInput & { order: number })[]
): Promise<{ created: number }> {
  const existing = await prisma.grammarRule.findMany({ select: { name: true, order: true } });
  const existingNames = new Set(existing.map((rule) => rule.name));
  let nextOrder = existing.reduce((max, rule) => Math.max(max, rule.order), -1) + 1;

  const missing = [...rules]
    .sort((a, b) => a.order - b.order)
    .filter((rule) => !existingNames.has(rule.name));

  await prisma.$transaction(
    missing.map((rule) =>
      prisma.grammarRule.create({
        data: {
          name: rule.name,
          label: rule.label,
          order: nextOrder++,
          definitions: { create: toDefinitionCreates(rule.definitions) },
        },
      })
    )
  );

  return { created: missing.length };
}

// ============================================================================
// TESTS
// ============================================================================

export interface GrammarTestRecord {
  id: string;
  reference: string;
  expectations: { type: string; value: string }[];
}

export interface GrammarTestWriteInput {
  reference: string;
  expectations: { type: string; value: string }[];
}

const testInclude = {
  expectations: { orderBy: { order: "asc" } },
} satisfies Prisma.GrammarTestInclude;

type GrammarTestWithExpectations = Prisma.GrammarTestGetPayload<{
  include: typeof testInclude;
}>;

function toTestRecord(test: GrammarTestWithExpectations): GrammarTestRecord {
  return {
    id: test.id,
    reference: test.reference,
    expectations: test.expectations.map(({ type, value }) => ({ type, value })),
  };
}

function toExpectationCreates(expectations: GrammarTestWriteInput["expectations"]) {
  return expectations.map((expectation, order) => ({ ...expectation, order }));
}

export async function getGrammarTests(): Promise<GrammarTestRecord[]> {
  const tests = await prisma.grammarTest.findMany({
    orderBy: { createdAt: "asc" },
    include: testInclude,
  });
  return tests.map(toTestRecord);
}

export async function createGrammarTest(
  input: GrammarTestWriteInput
): Promise<GrammarTestRecord> {
  const test = await prisma.grammarTest.create({
    data: {
      reference: input.reference,
      expectations: { create: toExpectationCreates(input.expectations) },
    },
    include: testInclude,
  });
  return toTestRecord(test);
}

export async function updateGrammarTest(
  id: string,
  input: GrammarTestWriteInput
): Promise<GrammarTestRecord> {
  const test = await prisma.$transaction(async (tx) => {
    await tx.grammarTestExpectation.deleteMany({ where: { grammarTestId: id } });
    return tx.grammarTest.update({
      where: { id },
      data: {
        reference: input.reference,
        expectations: { create: toExpectationCreates(input.expectations) },
      },
      include: testInclude,
    });
  });
  return toTestRecord(test);
}

export async function deleteGrammarTest(id: string): Promise<void> {
  await prisma.grammarTest.delete({ where: { id } });
}

/**
 * Turns an imported ingredient line into a grammar test, using its current
 * segments as the expected output so they can be corrected on /parser.
 */
export async function createGrammarTestFromIngredientLine(
  lineId: string
): Promise<GrammarTestRecord> {
  const line = await prisma.parsedIngredientLine.findUnique({
    where: { id: lineId },
    select: {
      reference: true,
      parsed: { orderBy: { index: "asc" }, select: { type: true, value: true } },
    },
  });
  if (!line) throw new Error("Ingredient line not found");

  const duplicate = await prisma.grammarTest.findFirst({
    where: { reference: line.reference },
    include: testInclude,
  });
  if (duplicate) return toTestRecord(duplicate);

  return createGrammarTest({ reference: line.reference, expectations: line.parsed });
}

// ============================================================================
// PUBLISHED VERSIONS AND PARSER SETTINGS
// ============================================================================

export const GLOBAL_SETTINGS_ID = "global";

export interface GrammarVersionRecord {
  id: string;
  hash: string;
  ruleCount: number;
  testsPassed: number;
  testsTotal: number;
  publishedAt: string;
}

export interface ParserSettingsRecord {
  activeParser: ActiveParser;
  activeGrammarVersion: GrammarVersionRecord | null;
  versions: GrammarVersionRecord[];
}

export interface ActiveParserConfig {
  activeParser: ActiveParser;
  grammarVersion: { id: string; hash: string; source: string } | null;
}

export function hashGrammarSource(source: string): string {
  return createHash("sha256").update(source).digest("hex");
}

function toVersionRecord(version: {
  id: string;
  hash: string;
  ruleCount: number;
  testsPassed: number;
  testsTotal: number;
  publishedAt: Date;
}): GrammarVersionRecord {
  return {
    id: version.id,
    hash: version.hash,
    ruleCount: version.ruleCount,
    testsPassed: version.testsPassed,
    testsTotal: version.testsTotal,
    publishedAt: version.publishedAt.toISOString(),
  };
}

const versionSelect = {
  id: true,
  hash: true,
  ruleCount: true,
  testsPassed: true,
  testsTotal: true,
  publishedAt: true,
} satisfies Prisma.GrammarVersionSelect;

/**
 * Saves a compiled grammar snapshot. Publishing identical source again
 * refreshes its test results instead of creating a duplicate.
 */
export async function publishGrammarVersion(input: {
  source: string;
  ruleCount: number;
  testsPassed: number;
  testsTotal: number;
}): Promise<GrammarVersionRecord> {
  const hash = hashGrammarSource(input.source);
  const version = await prisma.grammarVersion.upsert({
    where: { hash },
    create: { ...input, hash },
    update: { testsPassed: input.testsPassed, testsTotal: input.testsTotal },
    select: versionSelect,
  });
  return toVersionRecord(version);
}

export async function getParserSettings(versionLimit = 10): Promise<ParserSettingsRecord> {
  const [settings, versions] = await Promise.all([
    prisma.appSetting.findUnique({
      where: { id: GLOBAL_SETTINGS_ID },
      select: { activeParser: true, activeGrammarVersion: { select: versionSelect } },
    }),
    prisma.grammarVersion.findMany({
      orderBy: { publishedAt: "desc" },
      take: versionLimit,
      select: versionSelect,
    }),
  ]);

  return {
    activeParser: settings?.activeParser ?? "STATIC_V1",
    activeGrammarVersion: settings?.activeGrammarVersion
      ? toVersionRecord(settings.activeGrammarVersion)
      : null,
    versions: versions.map(toVersionRecord),
  };
}

export async function setActiveParser(
  activeParser: ActiveParser,
  grammarVersionId: string | null
): Promise<void> {
  if (activeParser === "DATABASE") {
    if (!grammarVersionId) throw new Error("Choose a published grammar version first");
    const version = await prisma.grammarVersion.findUnique({
      where: { id: grammarVersionId },
      select: { id: true },
    });
    if (!version) throw new Error("That grammar version no longer exists");
  }

  const data = {
    activeParser,
    activeGrammarVersionId: activeParser === "DATABASE" ? grammarVersionId : null,
  };

  await prisma.appSetting.upsert({
    where: { id: GLOBAL_SETTINGS_ID },
    create: { id: GLOBAL_SETTINGS_ID, ...data },
    update: data,
  });
}

/**
 * What the import queue needs to pick its ingredient parser.
 */
export async function getActiveParserConfig(): Promise<ActiveParserConfig> {
  const settings = await prisma.appSetting.findUnique({
    where: { id: GLOBAL_SETTINGS_ID },
    select: {
      activeParser: true,
      activeGrammarVersion: { select: { id: true, hash: true, source: true } },
    },
  });

  return {
    activeParser: settings?.activeParser ?? "STATIC_V1",
    grammarVersion: settings?.activeGrammarVersion ?? null,
  };
}
