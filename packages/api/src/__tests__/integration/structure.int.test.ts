import {
  createUser,
  execute,
  hasTestDatabase,
  resetDatabase,
} from "./helpers.js";

import { prisma, validateStoredNote } from "@peas/database";
import { segmentContent } from "@peas/parser/v2";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "../../auth/session.js";
import { createApiServer } from "../../server.js";

const curation = vi.hoisted(() => ({ isOpen: true }));
vi.mock("../../context.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../context.js")>();
  return {
    ...actual,
    canCurateKnowledge: (
      viewer: Parameters<typeof actual.canCurateKnowledge>[0]
    ) => curation.isOpen || actual.isAdmin(viewer),
  };
});

const server = createApiServer({ development: false });

const LIST = `
  query ($status: StructureListStatus, $pattern: String) {
    structureCounts { open decided byPattern { patternKey open } }
    structureProposals(status: $status, patternKey: $pattern) {
      total
      items { id noteTitle text assignedKind proposalType proposedLabel parts { kind text } patternKey status decidedLabel before { text } after { text } signals { id kind weight } }
    }
    structurePatterns { patternKey open approved precision scope canAutoApply }
  }
`;
const DECIDE = `
  mutation ($id: ID!, $input: StructureDecisionInput!) {
    decideStructureProposal(id: $id, input: $input) {
      success message proposal { status decidedLabel decidedBy }
      effect { changed { typename id } invalidatedDomains }
    }
  }
`;
const UNDO = `mutation ($id: ID!) { undoStructureDecision(id: $id) { success proposal { status } } }`;
const PATTERN = `
  mutation ($key: String!) {
    decideStructurePattern(patternKey: $key, input: { action: APPROVE }) { success message applied skipped effect { invalidatedDomains } }
  }
`;

async function storeNote(title: string, lines: string[]): Promise<string> {
  const note = await prisma.note.create({
    data: { title, html: lines.join("\n") },
    select: { id: true },
  });
  for (const block of segmentContent(lines)) {
    if (block.assigned === "INGREDIENT")
      await prisma.parsedIngredientLine.create({
        data: {
          noteId: note.id,
          blockIndex: block.blockIndex,
          lineIndex: block.lineIndex,
          reference: block.text,
        },
      });
    else
      await prisma.parsedInstructionLine.create({
        data: {
          noteId: note.id,
          lineIndex: block.lineIndex,
          originalText: block.text,
        },
      });
  }
  await validateStoredNote(note.id);
  return note.id;
}

describe.skipIf(!hasTestDatabase)(
  "Structure review resolvers (integration)",
  () => {
    let curator: AuthUser;
    let noteId: string;

    beforeAll(async () => {
      await resetDatabase();
      await prisma.structureProposal.deleteMany({});
      curator = await createUser({ username: "curator" });
      noteId = await storeNote("Glazed cake", [
        "For the glaze:",
        "1 cup powdered sugar",
        "2 tbsp milk",
        "",
        "Whisk until smooth, about 1 minute.",
        "",
      ]);
      await storeNote("Dip", ["For the dip:", "1 cup yogurt"]);
    });

    afterAll(async () => {
      await server.stop();
      await prisma.$disconnect();
    });

    it("lists proposals with context, counts, and patterns", async () => {
      const { data, errors } = await execute<{
        structureCounts: {
          open: number;
          byPattern: { patternKey: string; open: number }[];
        };
        structureProposals: {
          total: number;
          items: {
            text: string;
            noteTitle: string;
            after: { text: string }[];
            proposalType: string;
            parts: unknown[];
          }[];
        };
        structurePatterns: {
          patternKey: string;
          open: number;
          scope: string;
        }[];
      }>(server, curator, LIST, { status: "OPEN" });
      expect(errors).toBeUndefined();
      expect(data?.structureCounts.open).toBe(2);
      expect(data?.structureCounts.byPattern).toEqual([
        { patternKey: "SECTION_HEADING:COLON_HEADING", open: 2 },
      ]);
      const glaze = data?.structureProposals.items.find(
        (item) => item.text === "For the glaze:"
      );
      expect(glaze).toMatchObject({
        noteTitle: "Glazed cake",
        proposalType: "RECLASSIFY",
        parts: [],
      });
      expect(glaze?.after.map((line) => line.text)).toEqual([
        "1 cup powdered sugar",
        "2 tbsp milk",
      ]);
      expect(data?.structurePatterns[0]).toMatchObject({
        patternKey: "SECTION_HEADING:COLON_HEADING",
        open: 2,
        scope: "UNDECIDED",
      });
    });

    it("decides and undoes a proposal, reporting what went stale", async () => {
      const proposal = await prisma.structureProposal.findFirstOrThrow({
        where: { noteId },
      });
      const decided = await execute<{
        decideStructureProposal: {
          success: boolean;
          proposal: { status: string; decidedLabel: string; decidedBy: string };
          effect: {
            changed: { typename: string; id: string }[];
            invalidatedDomains: string[];
          };
        };
      }>(server, curator, DECIDE, {
        id: proposal.id,
        input: { action: "APPROVE" },
      });
      expect(decided.data?.decideStructureProposal).toMatchObject({
        success: true,
        proposal: {
          status: "APPROVED",
          decidedLabel: "SECTION_HEADING",
          decidedBy: "curator",
        },
        effect: { changed: [{ typename: "Note", id: noteId }] },
      });
      expect(
        decided.data?.decideStructureProposal.effect.invalidatedDomains
      ).toEqual(
        expect.arrayContaining(["STRUCTURE_REVIEW", "NOTE_DETAIL", "MENTIONS"])
      );

      const note = await execute<{
        note: {
          ingredientBlocks: {
            lines: { reference: string; lineKind: string; isActive: boolean }[];
          }[];
        };
      }>(
        server,
        curator,
        `query ($id: ID!) { note(id: $id) { ingredientBlocks { lines { reference lineKind isActive } } instructions { text lineKind } } }`,
        { id: noteId }
      );
      expect(note.data?.note.ingredientBlocks[0]?.lines[0]).toEqual({
        reference: "For the glaze:",
        lineKind: "SECTION_HEADING",
        isActive: false,
      });

      const again = await execute<{
        decideStructureProposal: { success: boolean; message: string };
      }>(server, curator, DECIDE, {
        id: proposal.id,
        input: { action: "CHANGE", label: "NOTE" },
      });
      expect(again.data?.decideStructureProposal).toMatchObject({
        success: false,
        message: expect.stringMatching(/undo that first/),
      });

      const undone = await execute<{
        undoStructureDecision: {
          success: boolean;
          proposal: { status: string };
        };
      }>(server, curator, UNDO, { id: proposal.id });
      expect(undone.data?.undoStructureDecision).toEqual({
        success: true,
        proposal: { status: "OPEN" },
      });
    });

    it("validates input and applies a pattern to every open proposal", async () => {
      const proposal = await prisma.structureProposal.findFirstOrThrow({
        where: { noteId },
      });
      const missingLabel = await execute<{
        decideStructureProposal: { success: boolean; message: string };
      }>(server, curator, DECIDE, {
        id: proposal.id,
        input: { action: "CHANGE" },
      });
      expect(missingLabel.data?.decideStructureProposal.success).toBe(false);
      expect(
        (
          await execute<{ structureProposal: unknown }>(
            server,
            curator,
            `{ structureProposal(id: "nope") { id } }`
          )
        ).data?.structureProposal
      ).toBeNull();

      const applied = await execute<{
        decideStructurePattern: {
          success: boolean;
          applied: number;
          skipped: number;
          message: string;
        };
      }>(server, curator, PATTERN, { key: "SECTION_HEADING:COLON_HEADING" });
      expect(applied.data?.decideStructurePattern).toMatchObject({
        success: true,
        applied: 2,
        skipped: 0,
        message: "Applied to 2 lines",
      });
      const decided = await execute<{
        structureProposals: { total: number; items: { status: string }[] };
      }>(server, curator, LIST, { status: "DECIDED" });
      expect(decided.data?.structureProposals.total).toBe(2);
    });

    it("is limited to curators", async () => {
      curation.isOpen = false;
      try {
        const { errors } = await execute(
          server,
          curator,
          `{ structureCounts { open } }`
        );
        expect(errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
      } finally {
        curation.isOpen = true;
      }
    });
  }
);
