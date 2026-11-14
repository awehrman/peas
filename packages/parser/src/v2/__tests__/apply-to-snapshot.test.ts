import { describe, expect, it, vi } from "vitest";

import {
  applyDecisionToSnapshot,
  decisionScope,
  editedEntryFor,
  entryTargetKey,
} from "../knowledge/apply-to-snapshot.js";
import { generatePlural } from "../knowledge/plural.js";
import type { DecisionPayload } from "../knowledge/schemas.js";
import {
  diffResolution,
  diffSyntax,
  summarizeResolution,
} from "../preview/diff.js";
import {
  type ResolverSnapshot,
  buildResolverContext,
} from "../resolve/context.js";
import { processIngredientLine } from "../resolve/process-line.js";

import {
  attributeId,
  conceptId,
  describeCandidate,
  fixtureId,
  loadSemanticFixture,
  snapshotFromFixture,
} from "./helpers/resolver.js";

type Fixture = ReturnType<typeof loadSemanticFixture>;

function snapshotWith(
  transform: (fixture: Fixture) => Fixture = (fixture) => fixture
): ResolverSnapshot {
  return snapshotFromFixture(transform(loadSemanticFixture()));
}

function idGenerator() {
  let next = 0;
  return () => fixtureId(`new:${(next += 1)}`);
}

function resolve(snapshot: ResolverSnapshot, line: string) {
  const context = buildResolverContext(snapshot);
  const [mention] = processIngredientLine(line, context).mentions;
  return {
    mention,
    context,
    described: describeCandidate(mention?.resolution.candidates[0], context),
  };
}

function apply(
  snapshot: ResolverSnapshot,
  payload: DecisionPayload,
  newId = idGenerator()
) {
  return applyDecisionToSnapshot(snapshot, payload, { newId });
}

const withPeppers = (fixture: Fixture): Fixture => ({
  ...fixture,
  entries: [
    ...fixture.entries,
    {
      id: fixtureId("entry:pepper-black"),
      text: "pepper",
      role: "FOOD",
      concept: "black-pepper",
    },
    {
      id: fixtureId("entry:pepper-bell"),
      text: "pepper",
      role: "FOOD",
      concept: "bell-pepper",
    },
  ],
  ontology: {
    ...fixture.ontology,
    concepts: [...fixture.ontology.concepts, "black-pepper", "bell-pepper"],
  },
});

describe("applyDecisionToSnapshot", () => {
  it("maps a phrase to a concept without mutating the input", () => {
    const before = snapshotWith();
    const copy = structuredClone(before);

    const after = apply(before, {
      type: "MAP_TO_CONCEPT",
      phrase: "icing sugar",
      conceptId: conceptId("powdered-sugar"),
      kind: "ALIAS",
    });

    expect(before).toEqual(copy);
    expect(after.revision).toBe(before.revision + 1);
    expect(
      after.entries.filter((entry) => entry.text === "icing sugar")
    ).toEqual([
      expect.objectContaining({
        role: "FOOD",
        kind: "ALIAS",
        status: "ACTIVE",
        conceptId: conceptId("powdered-sugar"),
      }),
    ]);
    expect(resolve(before, "2 tbsp icing sugar").mention?.status).toBe(
      "UNRESOLVED"
    );
    expect(resolve(after, "2 tbsp icing sugar")).toMatchObject({
      mention: { status: "AUTO_RESOLVED" },
      described: { concept: "powdered-sugar" },
    });
  });

  it("adds a generated plural, and an exclusive mapping removes the phrase's other meanings", () => {
    const before = snapshotWith(withPeppers);
    expect(resolve(before, "1 pepper").mention?.status).toBe("NEEDS_REVIEW");

    const after = apply(before, {
      type: "MAP_TO_CONCEPT",
      phrase: "pepper",
      conceptId: conceptId("black-pepper"),
      kind: "ALIAS",
      exclusive: true,
    });

    expect(resolve(after, "1 pepper")).toMatchObject({
      mention: { status: "AUTO_RESOLVED" },
      described: { concept: "black-pepper" },
    });
    expect(
      after.entries.filter(
        (entry) => entry.conceptId === conceptId("bell-pepper")
      )
    ).toEqual([]);

    const plural = apply(before, {
      type: "MAP_TO_CONCEPT",
      phrase: "scallion",
      conceptId: conceptId("chicken"),
      kind: "ALIAS",
    });
    expect(plural.entries.map((entry) => entry.text)).toEqual(
      expect.arrayContaining(["scallion", "scallions"])
    );
  });

  it("creates a verified concept with its entries, relationships, and characterizing attributes", () => {
    const after = apply(snapshotWith(), {
      type: "CREATE_CONCEPT",
      canonicalName: "calamansi juice",
      phrase: "calamansi juice",
      relationships: [
        {
          targetConceptId: conceptId("tomato"),
          relationshipType: "DERIVED_FROM",
        },
      ],
      attributeValueIds: [attributeId("form:whole")],
    });
    const created = after.concepts.find(
      (concept) => concept.canonicalName === "calamansi juice"
    );

    expect(created).toEqual({
      id: fixtureId("new:1"),
      canonicalName: "calamansi juice",
      status: "VERIFIED",
    });
    expect(
      after.entries
        .filter((entry) => entry.conceptId === created?.id)
        .map((entry) => [entry.text, entry.kind])
    ).toEqual([["calamansi juice", "CANONICAL"]]);
    expect(after.relationships).toContainEqual({
      sourceId: created?.id,
      targetId: conceptId("tomato"),
      type: "DERIVED_FROM",
    });
    expect(after.conceptAttributes).toContainEqual({
      conceptId: created?.id,
      attributeValueId: attributeId("form:whole"),
    });
    expect(
      resolve(after, "3 tablespoons calamansi juice").mention?.status
    ).toBe("AUTO_RESOLVED");

    const named = apply(snapshotWith(), {
      type: "CREATE_CONCEPT",
      canonicalName: "scallion",
      phrase: "green onion",
      relationships: [],
    });
    expect(
      named.entries.slice(-3).map((entry) => [entry.text, entry.kind])
    ).toEqual([
      ["scallion", "CANONICAL"],
      ["green onion", "ALIAS"],
      ["scallions", "PLURAL"],
    ]);
  });

  it("makes an attribute apply to a concept (concept plus attribute)", () => {
    const before = snapshotWith((fixture) => ({
      ...fixture,
      ontology: {
        ...fixture.ontology,
        applicability: fixture.ontology.applicability.filter(
          ([definition]) => definition !== "bone"
        ),
      },
    }));
    expect(
      resolve(before, "1 lb boneless chicken thighs").mention?.status
    ).toBe("NEEDS_REVIEW");

    const after = apply(before, {
      type: "CONCEPT_PLUS_ATTRIBUTE",
      phrase: "boneless chicken thighs",
      modifierText: "boneless",
      conceptId: conceptId("chicken"),
      attributeValueIds: [attributeId("bone:boneless")],
    });

    expect(resolve(after, "1 lb boneless chicken thighs")).toMatchObject({
      mention: { status: "AUTO_RESOLVED" },
      described: { concept: "chicken-thigh", attributes: ["bone:boneless"] },
    });
  });

  it("classifies modifiers, adds attribute values, and ignores noise words", () => {
    const newId = idGenerator();
    const degree = apply(
      snapshotWith(),
      {
        type: "CLASSIFY_MODIFIER",
        token: "loosely",
        role: "DEGREE",
        valueKey: "light",
      },
      newId
    );
    expect(resolve(degree, "1 cup loosely chopped parsley")).toMatchObject({
      mention: { status: "AUTO_RESOLVED" },
      described: {
        preparations: [
          { operation: "chop", degree: "light", position: "PRE_HEAD" },
        ],
      },
    });

    const color = apply(
      snapshotWith(),
      {
        type: "ADD_ATTRIBUTE_VALUE",
        definitionId: fixtureId("def:color"),
        key: "purple",
        label: "Purple",
        applicableConceptIds: [conceptId("tomato")],
      },
      newId
    );
    const purpleId =
      color.vocabulary.definitions
        .find((definition) => definition.key === "color")
        ?.values.find((value) => value.key === "purple")?.id ?? "";
    const classified = apply(
      color,
      {
        type: "CLASSIFY_MODIFIER",
        token: "purple",
        role: "ATTRIBUTE",
        attributeValueId: purpleId,
        applicableConceptIds: [conceptId("apple")],
      },
      newId
    );
    expect(classified.applicability).toContainEqual({
      definitionId: fixtureId("def:color"),
      conceptId: conceptId("tomato"),
    });
    expect(resolve(classified, "2 purple apples")).toMatchObject({
      mention: { status: "AUTO_RESOLVED" },
      described: { attributes: ["color:purple"] },
    });

    const ignored = apply(snapshotWith(), {
      type: "IGNORE_TOKEN",
      token: "organic",
    });
    expect(resolve(snapshotWith(), "2 cups organic milk").mention?.status).toBe(
      "NEEDS_REVIEW"
    );
    expect(resolve(ignored, "2 cups organic milk")).toMatchObject({
      mention: { status: "AUTO_RESOLVED" },
      described: { concept: "milk", modifiers: [] },
    });
  });

  it("adds a relationship once", () => {
    const payload: DecisionPayload = {
      type: "ADD_RELATIONSHIP",
      sourceConceptId: conceptId("tomato"),
      targetConceptId: conceptId("apple"),
      relationshipType: "IS_A",
    };
    const twice = apply(apply(snapshotWith(), payload), payload);

    expect(
      twice.relationships.filter(
        (edge) =>
          edge.sourceId === conceptId("tomato") &&
          edge.targetId === conceptId("apple")
      )
    ).toHaveLength(1);
  });

  it("merges a duplicate concept into the survivor", () => {
    const before = snapshotWith((fixture) => ({
      ...fixture,
      entries: [
        ...fixture.entries,
        {
          id: fixtureId("entry:icing"),
          text: "icing sugar",
          role: "FOOD",
          concept: "icing-sugar",
        },
        {
          id: fixtureId("entry:icing-powdered"),
          text: "Powdered Sugar",
          role: "FOOD",
          concept: "icing-sugar",
        },
      ],
      ontology: {
        ...fixture.ontology,
        concepts: [...fixture.ontology.concepts, "icing-sugar"],
        relationships: [
          ...fixture.ontology.relationships,
          ["icing-sugar", "IS_A", "powdered-sugar"],
        ],
        applicability: [
          ...fixture.ontology.applicability,
          ["form", "icing-sugar"],
        ],
      },
    }));
    before.priorVerifiedShare = {
      "icing sugar": {
        [conceptId("icing-sugar")]: 0.5,
        [conceptId("powdered-sugar")]: 0.5,
      },
    };

    const after = apply(before, {
      type: "MERGE_CONCEPTS",
      survivorId: conceptId("powdered-sugar"),
      mergedId: conceptId("icing-sugar"),
    });

    expect(
      after.concepts.some((concept) => concept.id === conceptId("icing-sugar"))
    ).toBe(false);
    expect(
      after.entries.find((entry) => entry.id === fixtureId("entry:icing"))
        ?.conceptId
    ).toBe(conceptId("powdered-sugar"));
    expect(
      after.entries.some(
        (entry) => entry.id === fixtureId("entry:icing-powdered")
      )
    ).toBe(false);
    expect(
      after.relationships.some((edge) => edge.sourceId === edge.targetId)
    ).toBe(false);
    expect(after.applicability).toContainEqual({
      definitionId: fixtureId("def:form"),
      conceptId: conceptId("powdered-sugar"),
    });
    expect(after.priorVerifiedShare).toEqual({
      "icing sugar": { [conceptId("powdered-sugar")]: 1 },
    });
    expect(resolve(after, "2 tbsp icing sugar").described?.concept).toBe(
      "powdered-sugar"
    );
  });

  it("approves a proposed concept and activates its proposed FOOD entries", () => {
    const before = snapshotWith();
    const salt = conceptId("salt");
    for (const concept of before.concepts)
      if (concept.id === salt) concept.status = "PROPOSED";
    for (const entry of before.entries)
      if (entry.conceptId === salt) entry.status = "PROPOSED";
    expect(resolve(before, "Salt to taste").mention?.status).toBe("UNRESOLVED");

    const after = apply(before, { type: "APPROVE_CONCEPT", conceptId: salt });

    expect(after.concepts.find((concept) => concept.id === salt)?.status).toBe(
      "VERIFIED"
    );
    expect(
      after.entries
        .filter((entry) => entry.conceptId === salt)
        .map((entry) => entry.status)
    ).not.toContain("PROPOSED");
    expect(resolve(after, "Salt to taste")).toMatchObject({
      mention: { status: "AUTO_RESOLVED" },
      described: { concept: "salt" },
    });
    expect(
      decisionScope({ type: "APPROVE_CONCEPT", conceptId: salt }, before)
    ).toEqual({ phrases: ["salt"], conceptIds: [salt], mentionIds: [] });
    expect(decisionScope({ type: "APPROVE_CONCEPT", conceptId: salt })).toEqual(
      { phrases: [], conceptIds: [salt], mentionIds: [] }
    );
  });

  it("edits a concept's names and parents in one decision", () => {
    const before = snapshotWith();
    const powdered = conceptId("powdered-sugar");
    const tomato = conceptId("tomato");
    const canonical = before.entries.find(
      (entry) => entry.conceptId === powdered && entry.text === "powdered sugar"
    );
    if (!canonical) throw new Error("fixture lacks powdered sugar");
    const salt = conceptId("salt");
    const saltEntry = before.entries.find((entry) => entry.conceptId === salt);
    if (!saltEntry) throw new Error("fixture lacks salt");

    const payload = {
      type: "EDIT_CONCEPT" as const,
      conceptId: powdered,
      canonicalName: "icing sugar",
      addNames: [{ text: "icing sugar", kind: "CANONICAL" as const }],
      setNameKinds: [{ entryId: canonical.id, kind: "ALIAS" as const }],
      retireEntryIds: [saltEntry.id],
      addRelationships: [
        { targetConceptId: tomato, relationshipType: "IS_A" as const },
      ],
    };
    const after = apply(before, payload);

    expect(
      after.concepts.find((concept) => concept.id === powdered)?.canonicalName
    ).toBe("icing sugar");
    expect(
      after.entries
        .filter((entry) => entry.conceptId === powdered)
        .map((entry) => [entry.text, entry.kind])
    ).toEqual(
      expect.arrayContaining([
        ["icing sugar", "CANONICAL"],
        ["powdered sugar", "ALIAS"],
      ])
    );
    expect(after.entries.some((entry) => entry.id === saltEntry.id)).toBe(
      false
    );
    expect(after.relationships).toContainEqual({
      sourceId: powdered,
      targetId: tomato,
      type: "IS_A",
    });
    expect(resolve(after, "2 tbsp icing sugar").described).toMatchObject({
      concept: "icing-sugar",
    });
    expect(
      resolve(after, "2 tbsp powdered sugar").mention?.resolution.candidates[0]
        ?.conceptId
    ).toBe(powdered);

    const undone = apply(after, {
      type: "EDIT_CONCEPT",
      conceptId: powdered,
      retireRelationships: [
        { targetConceptId: tomato, relationshipType: "IS_A" },
      ],
    });
    expect(undone.relationships).not.toContainEqual({
      sourceId: powdered,
      targetId: tomato,
      type: "IS_A",
    });

    const scope = decisionScope(payload, before);
    expect(scope.conceptIds).toEqual([powdered, tomato]);
    expect(scope.phrases).toEqual(
      expect.arrayContaining(["icing sugar", "powdered sugar", saltEntry.text])
    );
  });

  it("edits one lexicon entry: retires, repoints, re-kinds, and restores", () => {
    const before = snapshotWith();
    const entryNamed = (text: string, targetKey: string) => {
      const entry = before.entries.find(
        (row) => row.text === text && entryTargetKey(row) === targetKey
      );
      if (!entry) throw new Error(`fixture lacks ${text}`);
      return entry;
    };
    const finely = entryNamed("finely", "degree:fine");
    const retired = apply(before, {
      type: "EDIT_ENTRY",
      entryId: finely.id,
      text: "finely",
      role: "DEGREE",
      valueKey: "fine",
      status: "DEPRECATED",
    });
    expect(retired.entries.some((entry) => entry.id === finely.id)).toBe(false);

    const unripe = attributeId("ripeness:unripe");
    const green = entryNamed("green", `attr:${attributeId("color:green")}`);
    const repointed = apply(before, {
      type: "EDIT_ENTRY",
      entryId: green.id,
      text: "green",
      role: "ATTRIBUTE",
      attributeValueId: unripe,
      status: "ACTIVE",
    });
    expect(
      repointed.entries
        .filter((entry) => entry.text === "green")
        .map((entry) => entry.attributeValueId)
    ).toEqual([unripe]);

    const salt = conceptId("salt");
    const saltEntry = entryNamed("salt", `food:${salt}`);
    const rekinded = apply(before, {
      type: "EDIT_ENTRY",
      entryId: saltEntry.id,
      text: "salt",
      role: "FOOD",
      conceptId: salt,
      kind: "ALIAS",
      status: "PROPOSED",
    });
    expect(
      rekinded.entries.find(
        (entry) => entry.text === "salt" && entry.conceptId === salt
      )
    ).toMatchObject({ kind: "ALIAS", status: "PROPOSED" });

    const restored = apply(before, {
      type: "EDIT_ENTRY",
      entryId: fixtureId("entry:retired-kosher-salt"),
      text: "kosher salt",
      role: "FOOD",
      conceptId: salt,
      status: "ACTIVE",
    });
    expect(resolve(restored, "1 tsp kosher salt").described?.concept).toBe(
      "salt"
    );

    expect(
      decisionScope(
        {
          type: "EDIT_ENTRY",
          entryId: saltEntry.id,
          text: "sea salt",
          role: "FOOD",
          conceptId: conceptId("parsley"),
          status: "ACTIVE",
        },
        before
      )
    ).toEqual({
      phrases: ["sea salt", "salt"],
      conceptIds: [conceptId("parsley"), salt],
      mentionIds: [],
    });
  });

  it("keeps only the edited entry's role target, and scopes an edit without a snapshot", () => {
    const base = {
      type: "EDIT_ENTRY" as const,
      entryId: fixtureId("entry:edited"),
      text: "fresh",
      status: "ACTIVE" as const,
      conceptId: conceptId("salt"),
      attributeValueId: attributeId("color:green"),
      preparationId: fixtureId("prep"),
      valueKey: "fine",
    };
    expect(editedEntryFor({ ...base, role: "FOOD" })).toMatchObject({
      kind: "ALIAS",
      conceptId: conceptId("salt"),
      attributeValueId: null,
      valueKey: null,
    });
    expect(editedEntryFor({ ...base, role: "ATTRIBUTE" })).toMatchObject({
      kind: null,
      conceptId: null,
      attributeValueId: attributeId("color:green"),
      preparationId: null,
    });
    expect(editedEntryFor({ ...base, role: "PREPARATION" })).toMatchObject({
      preparationId: fixtureId("prep"),
      valueKey: null,
    });
    expect(editedEntryFor({ ...base, role: "INSTRUCTION" })).toMatchObject({
      valueKey: "fine",
      preparationId: null,
    });
    expect(
      editedEntryFor({
        type: "EDIT_ENTRY",
        entryId: base.entryId,
        text: "x",
        role: "DEGREE",
        status: "ACTIVE",
      })
    ).toMatchObject({ valueKey: null });

    expect(decisionScope({ ...base, role: "DEGREE" })).toEqual({
      phrases: ["fresh"],
      conceptIds: [],
      mentionIds: [],
    });
    const before = snapshotWith();
    const finely = before.entries.find((entry) => entry.text === "finely");
    expect(
      decisionScope(
        { ...base, role: "DEGREE", entryId: finely?.id ?? "" },
        before
      )
    ).toEqual({ phrases: ["fresh", "finely"], conceptIds: [], mentionIds: [] });
  });

  it("teaches from a correction, and leaves the snapshot alone for review-only decisions", () => {
    const taught = apply(snapshotWith(), {
      type: "CORRECT_MENTION",
      mentionId: fixtureId("mention"),
      conceptId: conceptId("parsley"),
      attributeValueIds: [],
      teachPhrase: "perejil",
    });
    expect(resolve(taught, "1 cup perejil").described?.concept).toBe("parsley");

    const before = snapshotWith();
    for (const payload of [
      { type: "REJECT", reason: "Not an ingredient" },
      {
        type: "MARK_AMBIGUOUS",
        phrase: "pepper",
        entryIds: [fixtureId("a"), fixtureId("b")],
      },
      { type: "REVERT", decisionId: fixtureId("decision") },
      {
        type: "CORRECT_MENTION",
        mentionId: fixtureId("mention"),
        conceptId: null,
        attributeValueIds: [],
      },
    ] satisfies DecisionPayload[]) {
      expect(apply(before, payload)).toEqual({
        ...before,
        revision: before.revision + 1,
      });
    }
  });
});

describe("diffResolution", () => {
  it("reports a newly resolved alias and the reading before and after", () => {
    const before = snapshotWith();
    const after = apply(before, {
      type: "MAP_TO_CONCEPT",
      phrase: "confectioners' sugar",
      conceptId: conceptId("powdered-sugar"),
      kind: "ALIAS",
    });
    const line = "2 tbsp confectioners' sugar";
    const old = resolve(before, line);
    const next = resolve(after, line);

    const diff = diffResolution(
      old.mention,
      next.mention,
      old.context,
      next.context
    );

    expect(diff).toMatchObject({
      changed: true,
      newlyResolved: true,
      conceptChanged: true,
      becameUnresolved: false,
    });
    expect(diff.after).toMatchObject({
      status: "AUTO_RESOLVED",
      conceptName: "powdered sugar",
      text: "powdered sugar",
    });
    expect(diff.before.status).not.toBe("AUTO_RESOLVED");
  });

  it("reports attribute changes, ambiguity, and lost resolutions", () => {
    const before = snapshotWith();
    const line = "1 cup whole milk";
    const withoutBoneless = snapshotWith((fixture) => ({
      ...fixture,
      entries: fixture.entries.filter((entry) => entry.text !== "boneless"),
    }));
    const thighs = "1 lb boneless chicken thighs";
    const attributes = diffResolution(
      resolve(withoutBoneless, thighs).mention,
      resolve(before, thighs).mention,
      resolve(withoutBoneless, thighs).context,
      resolve(before, thighs).context
    );
    expect(attributes).toMatchObject({
      changed: true,
      conceptChanged: false,
      attributesChanged: true,
      newlyResolved: true,
    });
    expect(attributes.after.text).toBe("chicken thigh (bone: boneless)");

    const peppers = snapshotWith(withPeppers);
    const single = snapshotWith((fixture) =>
      withPeppers({ ...fixture, entries: fixture.entries })
    );
    single.entries = single.entries.filter(
      (entry) => entry.id !== fixtureId("entry:pepper-bell")
    );
    const ambiguous = diffResolution(
      resolve(single, "1 pepper").mention,
      resolve(peppers, "1 pepper").mention,
      resolve(single, "1 pepper").context,
      resolve(peppers, "1 pepper").context
    );
    expect(ambiguous).toMatchObject({ changed: true, becameAmbiguous: true });
    expect(ambiguous.after.text).toMatch(/or 1 other$/);

    const lost = diffResolution(
      resolve(peppers, "1 pepper").mention,
      resolve(before, "1 pepper").mention,
      resolve(peppers, "1 pepper").context,
      resolve(before, "1 pepper").context
    );
    expect(lost).toMatchObject({ becameUnresolved: true });
    expect(lost.after.text).toBe("unresolved: pepper");

    const same = diffResolution(
      resolve(before, line).mention,
      resolve(before, line).mention,
      resolve(before, line).context,
      resolve(before, line).context
    );
    expect(same.changed).toBe(false);
  });
});

describe("generatePlural", () => {
  it.each([
    ["chicken thigh", "chicken thighs"],
    ["cherry tomato", "cherry tomatoes"],
    ["berry", "berries"],
    ["bay leaf", "bay leaves"],
    ["peach", "peaches"],
    ["Fig", "Figs"],
    ["radishes", null],
    ["all-purpose flour", null],
    ["calamansi juice", null],
    ["7-up", "7-ups"],
    ["  ", null],
  ])("%s -> %s", (phrase, plural) => {
    expect(generatePlural(phrase)).toBe(plural);
  });
});

describe("decisionScope", () => {
  const id = (key: string) => conceptId(key);

  it.each<
    [
      DecisionPayload,
      { phrases: string[]; conceptIds: string[]; mentionIds: string[] },
    ]
  >([
    [
      {
        type: "MAP_TO_CONCEPT",
        phrase: "scallion",
        conceptId: id("chicken"),
        kind: "ALIAS",
      },
      {
        phrases: ["scallion", "scallions"],
        conceptIds: [id("chicken")],
        mentionIds: [],
      },
    ],
    [
      {
        type: "CREATE_CONCEPT",
        canonicalName: "scallion",
        phrase: "green onion",
        relationships: [],
      },
      {
        phrases: ["scallion", "green onion", "scallions"],
        conceptIds: [],
        mentionIds: [],
      },
    ],
    [
      {
        type: "CONCEPT_PLUS_ATTRIBUTE",
        phrase: "whole milk",
        modifierText: "whole",
        conceptId: id("milk"),
        attributeValueIds: [attributeId("fat_content:whole")],
      },
      { phrases: ["whole"], conceptIds: [id("milk")], mentionIds: [] },
    ],
    [
      {
        type: "CONCEPT_PLUS_ATTRIBUTE",
        phrase: "whole milk",
        conceptId: id("milk"),
        attributeValueIds: [attributeId("fat_content:whole")],
      },
      { phrases: ["whole milk"], conceptIds: [id("milk")], mentionIds: [] },
    ],
    [
      {
        type: "CLASSIFY_MODIFIER",
        token: "ripe",
        role: "ATTRIBUTE",
        attributeValueId: attributeId("ripeness:ripe"),
        applicableConceptIds: [id("apple")],
      },
      { phrases: ["ripe"], conceptIds: [id("apple")], mentionIds: [] },
    ],
    [
      { type: "IGNORE_TOKEN", token: "good-quality" },
      { phrases: ["good-quality"], conceptIds: [], mentionIds: [] },
    ],
    [
      {
        type: "ADD_ATTRIBUTE_VALUE",
        definitionId: fixtureId("def:color"),
        key: "teal",
        label: "Teal",
        applicableConceptIds: [id("apple")],
      },
      { phrases: [], conceptIds: [id("apple")], mentionIds: [] },
    ],
    [
      {
        type: "ADD_RELATIONSHIP",
        sourceConceptId: id("tomato"),
        targetConceptId: id("apple"),
        relationshipType: "IS_A",
      },
      { phrases: [], conceptIds: [id("tomato"), id("apple")], mentionIds: [] },
    ],
    [
      {
        type: "MERGE_CONCEPTS",
        survivorId: id("milk"),
        mergedId: id("whole-milk"),
      },
      {
        phrases: [],
        conceptIds: [id("milk"), id("whole-milk")],
        mentionIds: [],
      },
    ],
    [
      {
        type: "MARK_AMBIGUOUS",
        phrase: "pepper",
        entryIds: [fixtureId("a"), fixtureId("b")],
      },
      { phrases: ["pepper"], conceptIds: [], mentionIds: [] },
    ],
    [
      {
        type: "CORRECT_MENTION",
        mentionId: fixtureId("m"),
        conceptId: id("parsley"),
        attributeValueIds: [],
        teachPhrase: "perejil",
      },
      {
        phrases: ["perejil", "perejils"],
        conceptIds: [],
        mentionIds: [fixtureId("m")],
      },
    ],
    [
      { type: "REJECT", reason: "noise" },
      { phrases: [], conceptIds: [], mentionIds: [] },
    ],
    [
      { type: "REVERT", decisionId: fixtureId("d") },
      { phrases: [], conceptIds: [], mentionIds: [] },
    ],
  ])("%j", (payload, expected) => {
    expect(decisionScope(payload)).toEqual(expected);
  });

  it("ignores attribute values whose dimension does not exist", () => {
    const after = apply(snapshotWith(), {
      type: "ADD_ATTRIBUTE_VALUE",
      definitionId: fixtureId("def:missing"),
      key: "teal",
      label: "Teal",
    });
    expect(after.vocabulary).toEqual(snapshotWith().vocabulary);
  });
});

describe("diffSyntax and summaries", () => {
  it("compares two parses by their readable summaries", () => {
    const context = buildResolverContext(snapshotWith());
    const line = processIngredientLine(
      "1 cup finely chopped parsley",
      context
    ).line;
    expect(diffSyntax(line, line)).toMatchObject({ changed: false });
    const plain = processIngredientLine("1 cup parsley", context).line;
    expect(diffSyntax(plain, line).changed).toBe(true);
  });

  it("summarizes preparations with their degree and a missing mention as unresolved", () => {
    const { mention, context } = resolve(
      snapshotWith(),
      "1 cup finely chopped parsley"
    );
    expect(summarizeResolution(mention, context)).toMatchObject({
      preparations: ["chop (fine)"],
      text: "parsley (chop (fine))",
    });
    expect(summarizeResolution(undefined, context)).toMatchObject({
      status: "UNRESOLVED",
      text: "unresolved",
      candidateCount: 0,
    });
  });
});

describe("snapshot helpers", () => {
  it("builds target keys for every role", () => {
    expect(entryTargetKey({ role: "FOOD", conceptId: "c" })).toBe("food:c");
    expect(entryTargetKey({ role: "ATTRIBUTE", attributeValueId: "a" })).toBe(
      "attr:a"
    );
    expect(entryTargetKey({ role: "PREPARATION", preparationId: "p" })).toBe(
      "prep:p"
    );
    expect(
      entryTargetKey({ role: "MEASUREMENT_MODIFIER", valueKey: "heaping" })
    ).toBe("measurement_modifier:heaping");
    expect(entryTargetKey({ role: "FOOD" })).toBe("food:");
  });

  it("generates UUIDs for created rows, with or without crypto.randomUUID", () => {
    const payload: DecisionPayload = {
      type: "CREATE_CONCEPT",
      canonicalName: "calamansi",
      phrase: "calamansi",
      relationships: [],
    };
    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(
      applyDecisionToSnapshot(snapshotWith(), payload).concepts.at(-1)?.id
    ).toMatch(uuid);

    vi.stubGlobal("crypto", undefined);
    try {
      expect(
        applyDecisionToSnapshot(snapshotWith(), payload).concepts.at(-1)?.id
      ).toMatch(uuid);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("activates a proposed entry instead of adding a duplicate, and adds preparations without applicability", () => {
    const before = snapshotWith((fixture) => ({
      ...fixture,
      entries: [
        ...fixture.entries,
        {
          id: fixtureId("entry:icing"),
          text: "icing sugar",
          role: "FOOD",
          concept: "powdered-sugar",
          status: "PROPOSED",
        },
      ],
    }));
    const after = apply(before, {
      type: "MAP_TO_CONCEPT",
      phrase: "Icing Sugar",
      conceptId: conceptId("powdered-sugar"),
      kind: "ALIAS",
    });
    expect(
      after.entries.filter(
        (entry) =>
          entry.conceptId === conceptId("powdered-sugar") &&
          entry.text.toLowerCase() === "icing sugar"
      )
    ).toEqual([
      expect.objectContaining({
        id: fixtureId("entry:icing"),
        status: "ACTIVE",
      }),
    ]);

    const prepared = apply(before, {
      type: "CLASSIFY_MODIFIER",
      token: "minced",
      role: "PREPARATION",
      preparationId: fixtureId("prep:mince"),
    });
    expect(prepared.applicability).toEqual(before.applicability);
    expect(prepared.entries.at(-1)).toMatchObject({
      text: "minced",
      role: "PREPARATION",
      preparationId: fixtureId("prep:mince"),
      valueKey: null,
    });
  });

  it("keeps priors untouched when the merged concept has none", () => {
    const before = snapshotWith();
    before.priorVerifiedShare = { milk: { [conceptId("milk")]: 1 } };
    const after = apply(before, {
      type: "MERGE_CONCEPTS",
      survivorId: conceptId("milk"),
      mergedId: conceptId("whole-milk"),
    });
    expect(after.priorVerifiedShare).toEqual({
      milk: { [conceptId("milk")]: 1 },
    });
  });

  it("keeps the case of irregular plurals", () => {
    expect(generatePlural("LEAF")).toBe("LEAVES");
    expect(generatePlural("Bay Leaf")).toBe("Bay Leaves");
  });
});
