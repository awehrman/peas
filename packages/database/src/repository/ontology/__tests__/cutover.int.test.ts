import {
  type SemanticOntology,
  createLine,
  createNote,
  createUser,
  hasTestDatabase,
  resetDatabase,
  seedSemanticOntology,
} from "./int-helpers.js";

import {
  type ResolverContext,
  buildResolverContext,
  processIngredientLine,
} from "@peas/parser/v2";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../../client.js";
import { seedOntologyVocabulary } from "../../../seed/ontology-vocabulary.js";
import { getDashboardStats } from "../../dashboard.js";
import { getNoteDetail } from "../../note.js";
import { getRecipesPage, promoteNoteToRecipe } from "../../recipe.js";
import { applyDecision } from "../apply-decision.js";
import { type ImportedLineInput, saveImportedLine } from "../backfill.js";
import { setClassification } from "../classifications.js";
import {
  removeClassification,
  removeSubstitution,
  setConceptTags,
  setSubstitution,
} from "../concept-editing.js";
import { getConceptDetail } from "../concepts.js";
import { getCorpusHealth } from "../corpus-health.js";
import { OntologyError } from "../helpers.js";
import {
  getReinterpretBacklog,
  getReinterpretRun,
  getReinterpretRunScope,
  planReinterpretBatches,
  recordReinterpretBatch,
  reinterpretBatch,
  requestReinterpretRun,
  selectReinterpretLines,
  startReinterpretRun,
} from "../reinterpret-runs.js";
import { loadResolverSnapshot } from "../resolver-context.js";

async function context(): Promise<ResolverContext> {
  return buildResolverContext(await loadResolverSnapshot());
}

function importedLine(
  noteId: string,
  reference: string,
  ctx: ResolverContext,
  lineIndex = 0
): ImportedLineInput {
  return {
    noteId,
    blockIndex: 0,
    lineIndex,
    reference,
    parseStatus: "COMPLETED_SUCCESSFULLY",
    isActive: true,
    parserVersion: "v2:test",
    result: processIngredientLine(reference, ctx),
  };
}

async function importNote(lines: string[], title = "Imported note") {
  const ctx = await context();
  const noteId = await createNote(title);
  const lineIds: string[] = [];
  for (const [index, reference] of lines.entries()) {
    const { lineId } = await saveImportedLine(
      importedLine(noteId, reference, ctx, index),
      ctx
    );
    lineIds.push(lineId);
  }
  return { noteId, lineIds };
}

describe.skipIf(!hasTestDatabase)("v2 cutover (integration)", () => {
  let ontology: SemanticOntology;
  const id = (key: string) => ontology.concepts[key] ?? "";

  beforeEach(async () => {
    await resetDatabase();
    await seedOntologyVocabulary();
    ontology = await seedSemanticOntology();
  });

  afterAll(async () => {
    await resetDatabase();
  });

  describe("saveImportedLine", () => {
    it("stores one mention per coordinated part, is idempotent, and never writes legacy tables", async () => {
      const ctx = await context();
      const noteId = await createNote();
      const input = importedLine(noteId, "Salt and parsley", ctx);

      const first = await saveImportedLine(input, ctx);
      const mentions = await prisma.ingredientMention.findMany({
        where: { parsedLineId: first.lineId },
        orderBy: [{ segmentIndex: "asc" }, { partIndex: "asc" }],
      });
      expect(
        mentions.map((mention) => [
          mention.segmentIndex,
          mention.partIndex,
          mention.conceptId,
          mention.rawText,
        ])
      ).toEqual([
        [0, 0, id("salt"), "Salt"],
        [0, 1, id("parsley"), "parsley"],
      ]);

      const counts = async () => ({
        lines: await prisma.parsedIngredientLine.count(),
        mentions: await prisma.ingredientMention.count(),
        discoveries: await prisma.discovery.count(),
      });
      const before = await counts();
      const second = await saveImportedLine(input, ctx);
      expect(second.lineId).toBe(first.lineId);
      expect(await counts()).toEqual(before);

      expect(await prisma.parsedSegment.count()).toBe(0);
      expect(await prisma.ingredientReference.count()).toBe(0);
      expect(await prisma.ingredient.count()).toBe(0);

      const line = await prisma.parsedIngredientLine.findUniqueOrThrow({
        where: { id: first.lineId },
      });
      expect(line).toMatchObject({
        parseStatus: "COMPLETED_SUCCESSFULLY",
        parserVersion: "v2:test",
      });
      expect(line.parsedAt).not.toBeNull();
    });

    it("returns note lines without legacy segments; mentions are read separately", async () => {
      const { noteId } = await importNote(["1 lb boneless chicken thighs"]);
      const detail = await getNoteDetail(noteId);
      const line = detail?.ingredientBlocks[0]?.lines[0];
      expect(line).toMatchObject({
        reference: "1 lb boneless chicken thighs",
        parserVersion: "v2:test",
      });
      expect(line).not.toHaveProperty("segments");
    });
  });

  describe("background reinterpretation runs", () => {
    it("selects stale lines, batches them deterministically, closes the run, and skips fresh lines on a retry", async () => {
      const { lineIds } = await importNote([
        "2 tbsp icing sugar",
        "1 cup icing sugar, sifted",
        "1 cup milk",
      ]);
      const userId = await createUser();
      const applied = await applyDecision({
        payload: {
          type: "MAP_TO_CONCEPT",
          phrase: "icing sugar",
          conceptId: id("powdered-sugar"),
          kind: "ALIAS",
        },
        userId,
        discoveryId: null,
      });
      const ctx = await context();
      const scope = { phrases: ["icing sugar"], conceptIds: [] };
      const request = {
        kind: "REINTERPRET_BY_REVISION" as const,
        revision: applied.revision,
        scope,
      };

      const run = await requestReinterpretRun(request);
      expect(run).toMatchObject({
        jobId: `reinterpret-${applied.revision}`,
        status: "PENDING",
      });
      expect((await requestReinterpretRun(request)).jobId).toBe(run.jobId);
      expect(await prisma.reinterpretRun.count()).toBe(1);
      expect(await getReinterpretRunScope(run.jobId)).toEqual(scope);

      const selected = await selectReinterpretLines(request, ctx);
      expect(selected).toEqual([lineIds[0], lineIds[1]].sort());
      const batches = planReinterpretBatches(run.jobId, selected, 1);
      expect(batches.map((batch) => batch.jobId)).toEqual([
        `${run.jobId}-1`,
        `${run.jobId}-2`,
      ]);
      await startReinterpretRun(run.jobId, {
        totalLines: selected.length,
        batchCount: batches.length,
      });
      expect(await getReinterpretBacklog()).toMatchObject({ processing: 1 });

      for (const batch of batches) {
        const result = await reinterpretBatch(batch.lineIds, ctx, run);
        expect(result).toMatchObject({ processed: 1, skipped: 0 });
        await recordReinterpretBatch(run.jobId, { lines: result.processed });
      }
      expect(await getReinterpretRun(run.jobId)).toMatchObject({
        status: "COMPLETED",
        processedLines: 2,
        completedBatches: 2,
        failedBatches: 0,
      });
      const resolved = await prisma.ingredientMention.findMany({
        where: { parsedLineId: { in: selected } },
      });
      expect(resolved.map((mention) => mention.conceptId)).toEqual([
        id("powdered-sugar"),
        id("powdered-sugar"),
      ]);

      expect(await reinterpretBatch(selected, ctx, run)).toEqual({
        processed: 0,
        skipped: 2,
        mentionsChanged: 0,
      });
      expect(await selectReinterpretLines(request, ctx)).toEqual([]);
    });

    it("fails a run once every batch has reported and one failed", async () => {
      const run = await requestReinterpretRun({
        kind: "REPARSE_BY_VERSION",
        parserVersion: "2.0.0",
      });
      await startReinterpretRun(run.jobId, { totalLines: 2, batchCount: 2 });
      await recordReinterpretBatch(run.jobId, { lines: 1 });
      const closed = await recordReinterpretBatch(run.jobId, {
        lines: 1,
        failed: true,
        errorMessage: "database timeout",
      });
      expect(closed).toMatchObject({
        status: "FAILED",
        processedLines: 1,
        failedBatches: 1,
        errorMessage: "database timeout",
      });
      expect(await getReinterpretBacklog()).toMatchObject({
        failed: 1,
        failedBatches: 1,
      });

      const empty = await requestReinterpretRun({
        kind: "REPARSE_BY_VERSION",
        parserVersion: "2.0.1",
      });
      expect(
        await startReinterpretRun(empty.jobId, { totalLines: 0, batchCount: 0 })
      ).toMatchObject({ status: "COMPLETED" });
    });
  });

  describe("concept editing", () => {
    it("edits classifications, tags, and substitutions shown on the concept page", async () => {
      const milk = id("milk");
      const wholeMilk = id("whole-milk");
      await setClassification(prisma, {
        conceptId: milk,
        kind: "FOOD_GROUP",
        key: "DAIRY",
        value: "TRUE",
      });
      await setClassification(prisma, {
        conceptId: wholeMilk,
        kind: "CATEGORY",
        key: "CATEGORY:Dairy case",
        value: "TRUE",
      });
      expect(
        await setConceptTags(wholeMilk, ["fridge", " Baking ", "FRIDGE"])
      ).toEqual(["Baking", "fridge"]);
      await setSubstitution({
        fromConceptId: wholeMilk,
        toConceptId: milk,
        ratio: " 1:1 ",
        note: "",
      });
      await expect(
        setSubstitution({ fromConceptId: milk, toConceptId: milk })
      ).rejects.toThrow(OntologyError);

      const detail = await getConceptDetail(wholeMilk);
      expect(detail?.tags).toEqual(["Baking", "fridge"]);
      expect(detail?.explicitClassificationKeys).toEqual([
        "CATEGORY:Dairy case",
      ]);
      expect(detail?.classifications.map((row) => row.key).sort()).toEqual([
        "CATEGORY:Dairy case",
        "DAIRY",
      ]);
      expect(detail?.substitutions).toEqual([
        { conceptId: milk, canonicalName: "milk", ratio: "1:1", note: null },
      ]);

      expect(await removeClassification(wholeMilk, "CATEGORY:Dairy case")).toBe(
        true
      );
      expect(await removeClassification(wholeMilk, "CATEGORY:Dairy case")).toBe(
        false
      );
      expect(await removeSubstitution(wholeMilk, milk)).toBe(true);
      expect(await removeSubstitution(wholeMilk, milk)).toBe(false);
      expect(await setConceptTags(wholeMilk, [])).toEqual([]);
      const cleared = await getConceptDetail(wholeMilk);
      expect(cleared).toMatchObject({
        tags: [],
        substitutions: [],
        explicitClassificationKeys: [],
      });
    });
  });

  describe("read paths on mentions and concepts", () => {
    it("filters recipes by concept with IS_A and PART_OF descendants, ranks top concepts, and reports corpus health", async () => {
      const stew = await importNote(
        ["1 lb boneless chicken thighs", "Salt and parsley"],
        "Stew"
      );
      const roast = await importNote(["2 lbs chicken", "Salt"], "Roast");
      await importNote(["2 cups milk"], "Not a recipe");
      await promoteNoteToRecipe(stew.noteId);
      await promoteNoteToRecipe(roast.noteId);
      const inactive = await createLine("3 tablespoons calamansi juice");
      await prisma.parsedIngredientLine.update({
        where: { id: inactive },
        data: { isActive: false },
      });

      const chicken = await getRecipesPage({ conceptId: id("chicken") });
      expect(chicken.items.map((recipe) => recipe.title).sort()).toEqual([
        "Roast",
        "Stew",
      ]);
      const exact = await getRecipesPage({
        conceptId: id("chicken"),
        exactConcept: true,
      });
      expect(exact.items.map((recipe) => recipe.title)).toEqual(["Roast"]);
      const thighs = await getRecipesPage({ conceptId: id("chicken-thigh") });
      expect(thighs.items.map((recipe) => recipe.title)).toEqual(["Stew"]);

      const stats = await getDashboardStats();
      expect(stats.topConcepts[0]).toEqual({
        conceptId: id("salt"),
        name: "salt",
        lineCount: 2,
      });
      expect(stats.conceptCount).toBe(Object.keys(ontology.concepts).length);
      expect(stats.verifiedConceptCount).toBe(stats.conceptCount);

      const health = await getCorpusHealth();
      expect(health).toMatchObject({
        lineCount: 5,
        linesWithMentions: 5,
        parsedSuccessfully: 5,
        reinterpretBacklog: { pending: 0, processing: 0, failed: 0 },
      });
      expect(health.mentions.total).toBe(6);
      expect(health.mentions.total).toBe(
        health.mentions.AUTO_RESOLVED +
          health.mentions.NEEDS_REVIEW +
          health.mentions.UNRESOLVED +
          health.mentions.VERIFIED
      );
    });
  });
});
