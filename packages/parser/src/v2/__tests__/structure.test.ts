import { describe, expect, it } from "vitest";

import {
  STRUCTURE_CLASSIFIER_VERSION,
  type StructureFixtureNote,
  blockFeatures,
  buildStructureReport,
  classifyLine,
  evaluateStructure,
  leadingHeading,
  parseFixtureNote,
  segmentContent,
  splitStoredContent,
  validateStructure,
} from "../structure/index.js";

import { loadFixture } from "./helpers/golden.js";

const kindOf = (text: string) => classifyLine(text).kind;
const findingsFor = (lines: string[]) =>
  validateStructure(segmentContent(lines)).findings;

describe("segmentContent", () => {
  it("files runs of lines as ingredient blocks and lines between blank lines as instructions", () => {
    expect(
      segmentContent([
        "2 eggs",
        "1 cup milk",
        "",
        "Whisk everything together.",
        "",
        "1 tsp salt",
        "1 tsp sugar",
      ])
    ).toEqual([
      {
        assigned: "INGREDIENT",
        contentIndex: 0,
        text: "2 eggs",
        blockIndex: 0,
        lineIndex: 0,
      },
      {
        assigned: "INGREDIENT",
        contentIndex: 1,
        text: "1 cup milk",
        blockIndex: 0,
        lineIndex: 1,
      },
      {
        assigned: "INSTRUCTION",
        contentIndex: 3,
        text: "Whisk everything together.",
        lineIndex: 0,
      },
      {
        assigned: "INGREDIENT",
        contentIndex: 5,
        text: "1 tsp salt",
        blockIndex: 1,
        lineIndex: 0,
      },
      {
        assigned: "INGREDIENT",
        contentIndex: 6,
        text: "1 tsp sugar",
        blockIndex: 1,
        lineIndex: 1,
      },
    ]);
  });

  it("keeps the importer's edge cases: the first line, short lone lines, tiny lines, and <br> lines", () => {
    const blocks = segmentContent([
      "",
      "Serves 4 people",
      "",
      "To serve:",
      "",
      "ab",
      "<br/>",
      "  ",
      "1 cup rice",
    ]);
    expect(blocks.map((b) => [b.contentIndex, b.assigned])).toEqual([
      [1, "INGREDIENT"],
      [3, "INGREDIENT"],
      [8, "INGREDIENT"],
    ]);
    expect(
      blocks.map((b) => (b.assigned === "INGREDIENT" ? b.blockIndex : -1))
    ).toEqual([0, 1, 2]);
  });

  it("does not end a block at a whitespace-only line", () => {
    const blocks = segmentContent(["1 cup rice", "   ", "2 cups water"]);
    expect(
      blocks.map((b) => b.assigned === "INGREDIENT" && b.blockIndex)
    ).toEqual([0, 0]);
  });

  it("rebuilds blocks from stored note content", () => {
    const stored = "\n2 eggs\n1 cup milk\n\nWhisk everything together.\n";
    expect(splitStoredContent(stored)).toHaveLength(6);
    expect(
      segmentContent(splitStoredContent(stored)).map((b) => b.contentIndex)
    ).toEqual([1, 2, 4]);
  });
});

describe("blockFeatures", () => {
  it("reads imperative verbs but not participles", () => {
    expect(blockFeatures("Roast the peppers until charred.").leadingVerb).toBe(
      "roast"
    );
    expect(blockFeatures("Roasted peppers").leadingVerb).toBeNull();
    expect(blockFeatures("Chopped parsley").leadingVerb).toBeNull();
  });

  it("reads ambiguous words as verbs only when an object follows", () => {
    expect(blockFeatures("Zest the lemon").leadingVerb).toBe("zest");
    expect(blockFeatures("Zest and juice of 1 orange").leadingVerb).toBeNull();
    expect(blockFeatures("Brown sugar, packed").leadingVerb).toBeNull();
    expect(blockFeatures("Top with cheese").leadingVerb).toBe("top");
  });

  it("treats 'X of' and unknown hyphenated words as descriptions", () => {
    expect(blockFeatures("Mix of salad greens").leadingVerb).toBeNull();
    expect(blockFeatures("Store-bought pie crust").leadingVerb).toBeNull();
    expect(blockFeatures("Stir-fry the beef").leadingVerb).toBe("stir-fry");
  });

  it("sets step numbers and bullets aside before reading the first word", () => {
    const features = blockFeatures("2. Add the onion");
    expect(features.numberedStep).toBe(true);
    expect(features.leadingVerb).toBe("add");
    expect(features.leadingQuantity).toBeNull();
    expect(blockFeatures("• 2 tbsp olive oil").leadingQuantity).toBe("EXACT");
  });

  it("finds temperatures, durations, and quantities", () => {
    const features = blockFeatures("Bake at 350°F for 10 to 12 minutes.");
    expect(features.temperature).toBe("350°F");
    expect(features.duration).toBe("10 to 12 minutes");
    expect(blockFeatures("2 tbsp olive oil")).toMatchObject({
      leadingQuantity: "EXACT",
      hasUnit: true,
    });
    expect(blockFeatures("Salt and pepper to taste").unspecifiedAmount).toBe(
      true
    );
  });
});

describe("classifyLine", () => {
  it("classifies the roadmap examples", () => {
    expect(kindOf("2 tbsp olive oil")).toBe("INGREDIENT");
    expect(kindOf("Salt and pepper to taste")).toBe("INGREDIENT");
    expect(kindOf("Cook for 20 minutes")).toBe("INSTRUCTION");
    expect(kindOf("Roasted peppers")).not.toBe("INSTRUCTION");
  });

  it("recognizes the common section headings", () => {
    for (const heading of [
      "For the sauce:",
      "For the marinade",
      "For the filling",
      "For the topping",
      "Garnish",
      "To serve",
      "FILLING",
    ])
      expect(kindOf(heading), heading).toBe("SECTION_HEADING");
  });

  it("recognizes notes, yields, and links", () => {
    expect(kindOf("Note: can be made a day ahead.")).toBe("NOTE");
    expect(kindOf("Serves 4")).toBe("OTHER");
    expect(kindOf("https://example.com/recipe")).toBe("OTHER");
  });

  it("is UNKNOWN when nothing is convincing", () => {
    expect(kindOf("Parmesan")).toBe("UNKNOWN");
  });
});

describe("leadingHeading", () => {
  it("finds a heading glued to the start of a line", () => {
    const text = "For the Cumberland sauce: Combine all the ingredients";
    expect(leadingHeading(text)).toEqual({
      heading: "For the Cumberland sauce:",
      rest: "Combine all the ingredients",
      restStart: 26,
    });
    expect(leadingHeading("Topping: 1 cup whipped cream")?.rest).toBe(
      "1 cup whipped cream"
    );
  });

  it("leaves notes and line labels alone", () => {
    expect(leadingHeading("Note: can be made ahead")).toBeNull();
    expect(leadingHeading("Optional: 1 tsp chili flakes")).toBeNull();
    expect(leadingHeading("Serving suggestion: rice")).toBeNull();
  });
});

describe("validateStructure", () => {
  it("raises nothing for a correctly filed note", () => {
    expect(
      findingsFor([
        "2 cups flour",
        "1 tsp salt",
        "Salt and pepper to taste",
        "",
        "Preheat the oven to 400 degrees.",
        "",
        "Cook for 20 minutes, stirring occasionally.",
      ])
    ).toEqual([]);
  });

  it("proposes a heading for 'For the sauce:' filed as an ingredient, with its evidence", () => {
    const [finding] = findingsFor([
      "For the sauce:",
      "2 tbsp butter",
      "1 cup cream",
    ]);
    expect(finding).toMatchObject({
      contentIndex: 0,
      assigned: "INGREDIENT",
      proposal: { type: "RECLASSIFY", kind: "SECTION_HEADING" },
      classifierVersion: STRUCTURE_CLASSIFIER_VERSION,
    });
    expect(finding?.margin).toBeGreaterThanOrEqual(2);
    expect(finding?.signals.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        "COLON_HEADING",
        "FOR_THE",
        "FOLLOWED_BY_INGREDIENTS",
      ])
    );
  });

  it("proposes instructions for steps written without blank lines", () => {
    const findings = findingsFor([
      "2 cups flour",
      "",
      "Whisk the flour and salt in a large bowl.",
      "Bake for 12 minutes, until golden.",
    ]);
    expect(findings.map((f) => [f.contentIndex, f.proposal])).toEqual([
      [2, { type: "RECLASSIFY", kind: "INSTRUCTION" }],
      [3, { type: "RECLASSIFY", kind: "INSTRUCTION" }],
    ]);
  });

  it("proposes an ingredient for an ingredient line standing alone", () => {
    const [finding] = findingsFor([
      "2 tbsp butter",
      "",
      "1 cup heavy cream, divided",
      "",
      "Melt the butter in a pan.",
    ]);
    expect(finding).toMatchObject({
      contentIndex: 2,
      assigned: "INSTRUCTION",
      proposal: { type: "RECLASSIFY", kind: "INGREDIENT" },
    });
  });

  it("splits a heading glued to a step, with offsets into the line", () => {
    const text = "For the glaze: Whisk the sugar and juice until smooth.";
    const [finding] = findingsFor(["1 cup sugar", "", text, ""]);
    expect(finding?.proposal).toEqual({
      type: "SPLIT",
      parts: [
        { kind: "SECTION_HEADING", text: "For the glaze:", start: 0, end: 14 },
        {
          kind: "INSTRUCTION",
          text: "Whisk the sugar and juice until smooth.",
          start: 15,
          end: text.length,
        },
      ],
    });
  });

  it("uses neighbors only for uncertain blocks", () => {
    const { blocks } = validateStructure(
      segmentContent([
        "1 flank steak",
        "For the marinade",
        "¼ cup olive oil",
        "3 cloves garlic",
      ])
    );
    expect(blocks[0]?.settled).toBe(true);
    expect(blocks[1]).toMatchObject({
      settled: false,
      label: "SECTION_HEADING",
    });
    expect(blocks[0]?.signals.map((s) => s.id)).not.toContain(
      "FOLLOWED_BY_INGREDIENTS"
    );
  });

  it("is deterministic and unchanged by case and surrounding whitespace", () => {
    const lines = [
      "for the sauce:",
      "2 tbsp butter",
      "",
      "Stir until thick, about 5 minutes.",
    ];
    expect(validateStructure(segmentContent(lines))).toEqual(
      validateStructure(segmentContent(lines))
    );
    const labels = (input: string[]) =>
      validateStructure(segmentContent(input)).blocks.map((b) => b.label);
    expect(labels(lines)).toEqual(
      labels([
        "  FOR THE SAUCE:  ",
        "2 tbsp butter ",
        "",
        " Stir until thick, about 5 minutes.",
      ])
    );
  });
});

describe("structure fixtures", () => {
  for (const name of ["notes.dev", "notes.holdout"]) {
    const notes = loadFixture<{ notes: StructureFixtureNote[] }>(
      `structure/${name}.json`
    ).notes.map(parseFixtureNote);
    const evaluation = evaluateStructure(notes);

    it(`${name}: never flags a correctly filed block`, () => {
      expect(evaluation.findings.falsePositives).toBe(0);
    });

    for (const outcome of evaluation.outcomes) {
      const title = `${name} ${outcome.noteId}:${outcome.block.contentIndex} "${outcome.block.text.slice(0, 40)}" is ${outcome.expected}`;
      const assertion = () =>
        expect(outcome.block.label).toBe(outcome.expected);
      if (outcome.knownFailure) it.fails(title, assertion);
      else it(title, assertion);
    }
  }
});

describe("evaluation and report", () => {
  it("rejects malformed fixture lines and unlabelled blocks", () => {
    expect(() => parseFixtureNote({ id: "x", lines: ["2 eggs"] })).toThrow(
      /expected/
    );
    expect(() => parseFixtureNote({ id: "x", lines: ["Z | 2 eggs"] })).toThrow(
      /unknown code Z/
    );
    const unlabelled = {
      ...parseFixtureNote({ id: "x", lines: ["I | 2 eggs"] }),
      lines: ["2 eggs", "1 cup milk"],
    };
    expect(() => evaluateStructure([unlabelled])).toThrow(/no label/);
  });

  it("measures the importer and the validator separately and lists disagreements", () => {
    const evaluation = evaluateStructure([
      parseFixtureNote({
        id: "mixed",
        lines: [
          "H | For the sauce:",
          "I | 2 tbsp butter",
          "",
          "I | Parmesan cheese",
          "",
          "S | Stir until thick, about 5 minutes.",
        ],
        knownFailures: [3],
      }),
    ]);
    expect(evaluation.importerAccuracy).toBeCloseTo(2 / 4);
    expect(evaluation.validatorAccuracy).toBeCloseTo(3 / 4);
    expect(evaluation.findings).toEqual({
      total: 1,
      correct: 1,
      falsePositives: 0,
      wrongProposal: 0,
      missed: 1,
    });

    const report = buildStructureReport([{ name: "sample", evaluation }]);
    expect(report).toContain(
      "| sample | 1 | 4 | 50.0% | 75.0% | 1 | 1 | 0 | 0 | 1 |"
    );
    expect(report).toContain(
      "| mixed (known) | 3 | Parmesan cheese | INSTRUCTION | INGREDIENT | INSTRUCTION |"
    );
  });
});
