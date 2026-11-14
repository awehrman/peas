import {
  buildResolverContext,
  processIngredientLine,
  segmentContent,
} from "@peas/parser/v2";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../client.js";
import {
  type ModifierSeedEntry,
  seedLexiconModifiers,
} from "../../seed/lexicon-modifiers.js";
import { seedOntologyVocabulary } from "../../seed/ontology-vocabulary.js";
import {
  type StarterFoodsSeed,
  seedStarterFoods,
} from "../../seed/starter-foods.js";
import {
  createUser,
  hasTestDatabase,
  resetDatabase,
} from "../ontology/__tests__/int-helpers.js";
import { saveImportedLine } from "../ontology/backfill.js";
import { loadResolverSnapshot } from "../ontology/resolver-context.js";
import {
  backfillStructure,
  decideStructurePattern,
  decideStructureProposal,
  getStructureCounts,
  getStructurePatterns,
  listStructureProposals,
  saveStructureFindings,
  undoStructureDecision,
  validateStoredNote,
} from "../structure.js";

function fixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL(`../../../../parser/fixtures/lexicon/${name}`, import.meta.url)
      ),
      "utf8"
    )
  ) as T;
}

/** Stores content the way the importer does: Note.html holds the lines, ingredient blocks are parsed and resolved, instructions stored as text. */
async function importContent(title: string, lines: string[]): Promise<string> {
  const ctx = buildResolverContext(await loadResolverSnapshot());
  const note = await prisma.note.create({
    data: { title, html: lines.join("\n") },
    select: { id: true },
  });
  for (const block of segmentContent(lines)) {
    if (block.assigned === "INGREDIENT")
      await saveImportedLine(
        {
          noteId: note.id,
          blockIndex: block.blockIndex,
          lineIndex: block.lineIndex,
          reference: block.text,
          parseStatus: "COMPLETED_SUCCESSFULLY",
          isActive: true,
          parserVersion: "v2:test",
          result: processIngredientLine(block.text, ctx),
        },
        ctx
      );
    else
      await prisma.parsedInstructionLine.create({
        data: {
          noteId: note.id,
          lineIndex: block.lineIndex,
          originalText: block.text,
        },
      });
  }
  return note.id;
}

async function proposalFor(noteId: string, text: string) {
  return prisma.structureProposal.findFirstOrThrow({ where: { noteId, text } });
}

async function ingredientLines(noteId: string) {
  return prisma.parsedIngredientLine.findMany({
    where: { noteId },
    orderBy: [{ blockIndex: "asc" }, { lineIndex: "asc" }],
    select: {
      blockIndex: true,
      lineIndex: true,
      reference: true,
      lineKind: true,
      isActive: true,
      contentIndex: true,
    },
  });
}

async function instructions(noteId: string) {
  return prisma.parsedInstructionLine.findMany({
    where: { noteId },
    orderBy: { lineIndex: "asc" },
    select: {
      lineIndex: true,
      originalText: true,
      lineKind: true,
      isActive: true,
    },
  });
}

describe.skipIf(!hasTestDatabase)("structure review (integration)", () => {
  let userId: string;

  beforeAll(async () => {
    await resetDatabase();
    await prisma.structureProposal.deleteMany({});
    await seedOntologyVocabulary();
    await seedLexiconModifiers(
      fixture<{ entries: ModifierSeedEntry[] }>("modifiers.seed.json").entries
    );
    await seedStarterFoods(
      fixture<StarterFoodsSeed>("starter-foods.seed.json")
    );
    userId = await createUser("structure-reviewer");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("records positions and proposals for a stored note, idempotently", async () => {
    const noteId = await importContent("Cream sauce", [
      "For the sauce:",
      "2 tbsp butter",
      "1 cup heavy cream",
      "",
      "Whisk until smooth, about 2 minutes.",
      "",
    ]);
    const first = await validateStoredNote(noteId);
    expect(first).toMatchObject({
      blocks: 4,
      findings: 1,
      created: 1,
      superseded: 0,
    });
    expect(
      (await ingredientLines(noteId)).map((line) => line.contentIndex)
    ).toEqual([0, 1, 2]);
    expect(await validateStoredNote(noteId)).toMatchObject({
      created: 0,
      updated: 1,
    });

    const [item] = (
      await listStructureProposals({
        patternKey: "SECTION_HEADING:COLON_HEADING",
      })
    ).items.filter((row) => row.noteId === noteId);
    expect(item).toMatchObject({
      text: "For the sauce:",
      assignedKind: "INGREDIENT",
      proposedLabel: "SECTION_HEADING",
      status: "OPEN",
      before: [],
      after: [
        { contentIndex: 1, text: "2 tbsp butter" },
        { contentIndex: 2, text: "1 cup heavy cream" },
      ],
    });
  });

  it("turns an ingredient into a heading kept in place, and undoes it", async () => {
    const noteId = await importContent("Heading", [
      "For the glaze:",
      "1 cup powdered sugar",
      "2 tbsp milk",
    ]);
    await validateStoredNote(noteId);
    const proposal = await proposalFor(noteId, "For the glaze:");

    const decided = await decideStructureProposal(
      proposal.id,
      { action: "APPROVE" },
      userId
    );
    expect(decided).toMatchObject({
      status: "APPROVED",
      decidedLabel: "SECTION_HEADING",
      decidedBy: "structure-reviewer",
    });
    expect((await ingredientLines(noteId))[0]).toMatchObject({
      reference: "For the glaze:",
      lineKind: "SECTION_HEADING",
      isActive: false,
    });
    expect(
      (
        await decideStructureProposal(
          proposal.id,
          { action: "APPROVE" },
          userId
        )
      ).status
    ).toBe("APPROVED");
    await expect(
      decideStructureProposal(proposal.id, { action: "REJECT" }, userId)
    ).rejects.toThrow(/undo that first/);

    expect(await validateStoredNote(noteId)).toMatchObject({
      created: 0,
      updated: 0,
    });
    expect(
      (
        await prisma.structureProposal.findUniqueOrThrow({
          where: { id: proposal.id },
        })
      ).status
    ).toBe("APPROVED");

    const undone = await undoStructureDecision(proposal.id);
    expect(undone).toMatchObject({ status: "OPEN", decidedLabel: null });
    expect((await ingredientLines(noteId))[0]).toMatchObject({
      lineKind: "INGREDIENT",
      isActive: true,
    });
  });

  it("moves steps out of an ingredient block into the instructions, in reading order", async () => {
    const noteId = await importContent("Biscuits", [
      "2 cups flour",
      "",
      "Preheat the oven to 400 degrees.",
      "",
      "Whisk the flour and salt in a large bowl.",
      "Bake for 12 minutes, until golden.",
      "",
      "Serve warm with butter and honey.",
      "",
    ]);
    await validateStoredNote(noteId);
    const whisk = await proposalFor(
      noteId,
      "Whisk the flour and salt in a large bowl."
    );
    await decideStructureProposal(whisk.id, { action: "APPROVE" }, userId);

    expect(
      (await instructions(noteId)).map((line) => line.originalText)
    ).toEqual([
      "Preheat the oven to 400 degrees.",
      "Whisk the flour and salt in a large bowl.",
      "Serve warm with butter and honey.",
    ]);
    const lines = await ingredientLines(noteId);
    expect(
      lines.find((line) => line.reference.startsWith("Whisk"))
    ).toMatchObject({ lineKind: "INSTRUCTION", isActive: false });

    await undoStructureDecision(whisk.id);
    expect(
      (await instructions(noteId)).map((line) => line.originalText)
    ).toEqual([
      "Preheat the oven to 400 degrees.",
      "Serve warm with butter and honey.",
    ]);
    expect(
      (await ingredientLines(noteId)).filter((line) => line.isActive)
    ).toHaveLength(3);
  });

  it("moves an ingredient filed as a step into the ingredients, resolved, and undoes it", async () => {
    const noteId = await importContent("Shrimp", [
      "2 tbsp butter",
      "",
      "1 cup heavy cream, divided",
      "",
      "Melt the butter in a large skillet.",
      "",
    ]);
    await validateStoredNote(noteId);
    const cream = await proposalFor(noteId, "1 cup heavy cream, divided");
    await decideStructureProposal(cream.id, { action: "APPROVE" }, userId);

    const added = await prisma.parsedIngredientLine.findFirstOrThrow({
      where: { noteId, reference: "1 cup heavy cream, divided" },
      include: { mentions: { include: { concept: true } } },
    });
    expect(added).toMatchObject({
      blockIndex: 1,
      isActive: true,
      lineKind: "INGREDIENT",
      contentIndex: 2,
    });
    expect(added.mentions[0]?.concept?.canonicalName).toBe("heavy cream");
    expect(
      (await instructions(noteId)).find((line) =>
        line.originalText.startsWith("1 cup")
      )
    ).toMatchObject({ lineKind: "INGREDIENT", isActive: false });

    await undoStructureDecision(cream.id);
    expect(
      await prisma.parsedIngredientLine.count({
        where: { noteId, reference: "1 cup heavy cream, divided" },
      })
    ).toBe(0);
    expect(
      await prisma.ingredientMention.count({
        where: { parsedLineId: added.id },
      })
    ).toBe(0);
  });

  it("splits a heading off a step and off an ingredient, and undoes both", async () => {
    const noteId = await importContent("Cake", [
      "2 cups flour",
      "Topping: 1 cup heavy cream",
      "1 tsp salt",
      "",
      "Preheat the oven to 350 degrees.",
      "",
      "For the glaze: Whisk the sugar and milk until smooth.",
      "",
      "Pour over the cake.",
      "",
    ]);
    await validateStoredNote(noteId);

    const glaze = await proposalFor(
      noteId,
      "For the glaze: Whisk the sugar and milk until smooth."
    );
    expect(glaze.proposedLabel).toBe("SECTION_HEADING+INSTRUCTION");
    await decideStructureProposal(glaze.id, { action: "APPROVE" }, userId);
    expect(
      (await instructions(noteId)).map((line) => [
        line.lineIndex,
        line.originalText,
        line.lineKind,
      ])
    ).toEqual([
      [0, "Preheat the oven to 350 degrees.", "INSTRUCTION"],
      [1, "For the glaze:", "SECTION_HEADING"],
      [2, "Whisk the sugar and milk until smooth.", "INSTRUCTION"],
      [3, "Pour over the cake.", "INSTRUCTION"],
    ]);

    const topping = await proposalFor(noteId, "Topping: 1 cup heavy cream");
    expect(topping.proposedLabel).toBe("SECTION_HEADING+INGREDIENT");
    await decideStructureProposal(topping.id, { action: "APPROVE" }, userId);
    expect(
      (await ingredientLines(noteId)).map((line) => [
        line.lineIndex,
        line.reference,
        line.lineKind,
        line.isActive,
      ])
    ).toEqual([
      [0, "2 cups flour", "INGREDIENT", true],
      [1, "Topping:", "SECTION_HEADING", false],
      [2, "1 cup heavy cream", "INGREDIENT", true],
      [3, "1 tsp salt", "INGREDIENT", true],
    ]);
    const cream = await prisma.parsedIngredientLine.findFirstOrThrow({
      where: { noteId, reference: "1 cup heavy cream" },
      include: { mentions: { include: { concept: true } } },
    });
    expect(cream.mentions[0]?.concept?.canonicalName).toBe("heavy cream");

    await undoStructureDecision(topping.id);
    await undoStructureDecision(glaze.id);
    expect(
      (await ingredientLines(noteId)).map((line) => [
        line.lineIndex,
        line.reference,
      ])
    ).toEqual([
      [0, "2 cups flour"],
      [1, "Topping: 1 cup heavy cream"],
      [2, "1 tsp salt"],
    ]);
    expect(
      (await instructions(noteId)).map((line) => line.originalText)
    ).toEqual([
      "Preheat the oven to 350 degrees.",
      "For the glaze: Whisk the sugar and milk until smooth.",
      "Pour over the cake.",
    ]);
  });

  it("applies an earlier decision again when the same content is imported again, and records element tags", async () => {
    const content = ["For the brine:", "4 cups water", "1/4 cup kosher salt"];
    const original = await importContent("Brine", content);
    await prisma.note.update({
      where: { id: original },
      data: { contentHash: "same-brine" },
    });
    await validateStoredNote(original);
    await decideStructureProposal(
      (await proposalFor(original, "For the brine:")).id,
      { action: "APPROVE" },
      userId
    );

    const again = await importContent("Brine again", content);
    await prisma.note.update({
      where: { id: again },
      data: { contentHash: "same-brine" },
    });
    const result = await validateStoredNote(again, {
      contentTags: ["div", "div", "li"],
    });
    expect(result.carriedOver).toBe(1);
    expect(await proposalFor(again, "For the brine:")).toMatchObject({
      status: "APPROVED",
      decidedById: userId,
    });
    const lines = await prisma.parsedIngredientLine.findMany({
      where: { noteId: again },
      orderBy: { lineIndex: "asc" },
      select: { lineKind: true, elementTag: true },
    });
    expect(lines).toEqual([
      { lineKind: "SECTION_HEADING", elementTag: "div" },
      { lineKind: "INGREDIENT", elementTag: "div" },
      { lineKind: "INGREDIENT", elementTag: "li" },
    ]);
  });

  it("rejects, changes to another kind, and treats the importer's kind as a rejection", async () => {
    const noteId = await importContent("Notes", [
      "2 cups rice",
      "",
      "Note: The rice can be cooked a day ahead.",
      "",
      "Simmer the rice for 18 minutes.",
      "",
    ]);
    await validateStoredNote(noteId);
    const note = await proposalFor(
      noteId,
      "Note: The rice can be cooked a day ahead."
    );
    expect(
      (
        await decideStructureProposal(
          note.id,
          { action: "CHANGE", label: "INSTRUCTION" },
          userId
        )
      ).status
    ).toBe("REJECTED");
    expect((await instructions(noteId)).every((line) => line.isActive)).toBe(
      true
    );
    await undoStructureDecision(note.id);
    expect(
      (
        await decideStructureProposal(
          note.id,
          { action: "CHANGE", label: "OTHER" },
          userId
        )
      ).status
    ).toBe("CHANGED");
    expect((await instructions(noteId))[0]).toMatchObject({
      lineKind: "OTHER",
      isActive: false,
    });
  });

  it("supersedes open proposals the validator no longer raises, never decided ones", async () => {
    const noteId = await importContent("Supersede", [
      "For the dip:",
      "1 cup yogurt",
      "For the salad:",
      "2 cups lettuce",
    ]);
    await validateStoredNote(noteId);
    const dip = await proposalFor(noteId, "For the dip:");
    await decideStructureProposal(dip.id, { action: "REJECT" }, userId);
    expect(
      await saveStructureFindings(noteId, [], { supersedeMissing: true })
    ).toEqual({ created: 0, updated: 0, superseded: 1 });
    expect((await proposalFor(noteId, "For the salad:")).status).toBe(
      "SUPERSEDED"
    );
    expect((await proposalFor(noteId, "For the dip:")).status).toBe("REJECTED");
    await expect(
      undoStructureDecision((await proposalFor(noteId, "For the salad:")).id)
    ).rejects.toThrow(/superseded/);
  });

  it("measures patterns and gates automatic application on their precision", async () => {
    const patterns = await getStructurePatterns();
    const colon = patterns.find(
      (row) => row.patternKey === "SECTION_HEADING:COLON_HEADING"
    );
    expect(colon).toMatchObject({ canAutoApply: false });
    expect(colon?.approved).toBeGreaterThanOrEqual(0);
    await expect(
      decideStructurePattern(
        "SECTION_HEADING:COLON_HEADING",
        { action: "APPROVE" },
        userId,
        { requirePrecision: true }
      )
    ).rejects.toThrow(/hasn't earned automatic application/);

    const before = (await getStructureCounts()).open;
    const applied = await decideStructurePattern(
      "SECTION_HEADING:COLON_HEADING",
      { action: "APPROVE" },
      userId
    );
    expect(applied.applied).toBeGreaterThan(0);
    expect((await getStructureCounts()).open).toBe(before - applied.applied);
    const after = (await getStructurePatterns()).find(
      (row) => row.patternKey === "SECTION_HEADING:COLON_HEADING"
    );
    expect(after?.precision).toBeGreaterThan(0);
    expect(after?.scope).not.toBe("UNDECIDED");
  });

  it("backfills every note with a checkpoint per batch", async () => {
    const checkpoints: string[] = [];
    const summary = await backfillStructure({
      batchSize: 3,
      onBatch: ({ checkpoint }) => checkpoints.push(checkpoint),
    });
    expect(summary.notes).toBe(
      await prisma.note.count({ where: { archivedAt: null } })
    );
    expect(checkpoints.length).toBeGreaterThan(1);
    const resumed = await backfillStructure({
      after: checkpoints[checkpoints.length - 1],
    });
    expect(resumed.notes).toBe(0);
  });
});
