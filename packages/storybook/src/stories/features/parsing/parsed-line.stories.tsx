import { ParsedLine, ParsedLineLegend } from "@peas/features";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Parsing/ParsedLine",
  component: ParsedLine,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ParsedLine>;

export default meta;
type Story = StoryObj<typeof ParsedLine>;

export const Parsed: Story = {
  args: {
    reference: "2 cups flour, sifted",
    parseStatus: "COMPLETED_SUCCESSFULLY",
    segments: [
      { index: 0, type: "amount", value: "2", rule: "#1_ingredientLine >> #5_amount" },
      { index: 1, type: "unit", value: "c", rule: "#1_ingredientLine >> #8_unit" },
      { index: 2, type: "ingredient", value: "flour", rule: "#1_ingredientLine >> #2_ingredient", ingredientId: "flour" },
      { index: 3, type: "comment", value: ", sifted", rule: "#1_ingredientLine >> #1_comment" },
    ],
    getIngredientHref: (id: string) => `/ingredients?id=${id}`,
  },
};

export const WithDescriptor: Story = {
  args: {
    reference: "1 large yellow onion, diced",
    parseStatus: "COMPLETED_SUCCESSFULLY",
    segments: [
      { index: 0, type: "amount", value: "1" },
      { index: 1, type: "descriptor", value: "large" },
      { index: 2, type: "descriptor", value: "yellow" },
      { index: 3, type: "ingredient", value: "onion" },
      { index: 4, type: "comment", value: ", diced" },
    ],
  },
};

export const ParseError: Story = {
  args: {
    reference: "a generous glug of something nice",
    parseStatus: "COMPLETED_WITH_ERROR",
    segments: [],
  },
};

export const AwaitingParse: Story = {
  args: {
    reference: "3 cloves garlic",
    parseStatus: "AWAITING_PARSING",
    segments: [],
  },
};

export const Legend: Story = {
  render: () => <ParsedLineLegend />,
};
