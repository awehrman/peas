import { useState } from "react";

import {
  type GrammarRuleDraft,
  type GrammarRuleView,
  RuleBuilder,
  RuleEditor,
  createRuleDraft,
} from "@peas/features";
import type { Meta, StoryObj } from "@storybook/react";

const RULES: GrammarRuleView[] = [
  {
    id: "rule-1",
    name: "ingredientLine",
    label: "Ingredient Line",
    order: 0,
    definitions: [
      {
        id: "def-1",
        type: "RULE",
        order: 0,
        example: "11 apples",
        rule: "amt:(@amount _+)? ing:ingredient",
        formatter: "{\n  return {\n    rule: `#${ORDER}_ingredientLine`,\n    type: 'ingredientLine',\n    values: [amt, ing].filter(Boolean)\n  };\n}",
        list: [],
      },
    ],
  },
  {
    id: "rule-2",
    name: "amount",
    label: "Amount",
    order: 1,
    definitions: [
      { id: "def-2", type: "RULE", order: 0, example: "one", rule: "amt:amountKeyword", formatter: "", list: [] },
      { id: "def-3", type: "RULE", order: 1, example: "11", rule: "amt:digits", formatter: "", list: [] },
    ],
  },
  {
    id: "rule-3",
    name: "amountKeyword",
    label: "Amount Keyword",
    order: 2,
    definitions: [
      { id: "def-4", type: "LIST", order: 0, example: "", rule: "", formatter: "", list: ["'three'i", "'one'i", "'two'i"] },
    ],
  },
];

const ruleNames = new Set(RULES.map((rule) => rule.name));

function EditorHarness({ initialDraft }: { initialDraft: GrammarRuleDraft }) {
  const [draft, setDraft] = useState(initialDraft);

  return (
    <div style={{ maxWidth: 760 }}>
      <RuleEditor
        idPrefix="story-rule"
        draft={draft}
        onDraftChange={setDraft}
        ruleNames={ruleNames}
        otherRuleNames={ruleNames}
        submitLabel="Add rule"
        isPending={false}
        error={null}
        onSubmit={() => console.log("Submit rule", draft)}
        onCancel={() => setDraft(initialDraft)}
      />
    </div>
  );
}

const meta = {
  title: "Parser/RuleEditor",
  component: EditorHarness,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof EditorHarness>;

export default meta;
type Story = StoryObj<typeof EditorHarness>;

export const NewRule: Story = {
  args: { initialDraft: createRuleDraft() },
};

export const ReferencesMissingRule: Story = {
  args: {
    initialDraft: {
      name: "quantity",
      label: "Quantity",
      definitions: [
        { type: "RULE", example: "2 cups", rule: "amt:amount _ unt:unit", formatter: "", list: [] },
      ],
    },
  },
};

export const KeywordList: Story = {
  args: {
    initialDraft: {
      name: "unit",
      label: "Unit",
      definitions: [
        { type: "LIST", example: "", rule: "", formatter: "", list: ["'tablespoon'i", "'cups'i", "'cup'i"] },
      ],
    },
  },
};

const ok = async () => ({ success: true as const });

export const Builder: StoryObj<typeof RuleBuilder> = {
  render: () => (
    <div style={{ maxWidth: 960, height: 720 }}>
      <RuleBuilder
        rules={RULES}
        onCreateRule={ok}
        onUpdateRule={ok}
        onDeleteRule={ok}
        onReorderRules={ok}
        onSeedRules={async () => ({ success: true, data: { created: 0 } })}
        onResetRules={async () => ({ success: true, data: { deleted: RULES.length } })}
      />
    </div>
  ),
};
