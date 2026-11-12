import { IngredientCard, type IngredientDetail, type IngredientOption } from "@peas/features";
import type { Meta, StoryObj } from "@storybook/react";

const PANTRY: IngredientOption[] = [
  { id: "apple", name: "apple" },
  { id: "pear", name: "pear" },
  { id: "quince", name: "quince" },
  { id: "granny-smith", name: "granny smith apple" },
];

const ingredient: IngredientDetail = {
  id: "apple",
  name: "apple",
  plural: "apples",
  isReviewed: false,
  reviewedAt: null,
  isComposedIngredient: false,
  properties: ["FRUIT", "VEGAN", "VEGETARIAN"],
  aliases: [{ id: "alias-1", name: "eating apple" }],
  substitutions: [{ id: "pear", name: "pear" }],
  parent: null,
  variants: [{ id: "granny-smith", name: "granny smith apple" }],
  category: "fruit",
  tags: ["baking"],
  referenceCount: 3,
  references: [
    { id: "ref-1", reference: "2 apples, peeled and sliced", noteId: "note-1", noteTitle: "Apple Crumble" },
    { id: "ref-2", reference: "1 apple, grated", noteId: "note-2", noteTitle: "Bircher Muesli" },
    { id: "ref-3", reference: "4 large apples", noteId: null, noteTitle: null },
  ],
};

const searchPantry = async (query: string, excludeId?: string) =>
  PANTRY.filter(
    (option) => option.id !== excludeId && option.name.includes(query.toLowerCase())
  );

const meta = {
  title: "Ingredients/IngredientCard",
  component: IngredientCard,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: {
    ingredient,
    categoryOptions: ["fruit", "vegetable", "dairy"],
    isReviewQueue: false,
    onSearch: searchPantry,
    onSave: async (input) => {
      console.log("Saving ingredient", input);
      return { success: true, data: { nextId: null } };
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IngredientCard>;

export default meta;
type Story = StoryObj<typeof IngredientCard>;

export const NeedsReview: Story = {};

export const ReviewQueue: Story = {
  args: { isReviewQueue: true },
};

export const Reviewed: Story = {
  args: {
    ingredient: { ...ingredient, isReviewed: true, reviewedAt: "2026-11-01T12:00:00.000Z" },
  },
};

export const SaveFails: Story = {
  args: {
    onSave: async () => ({ success: false, message: 'An ingredient named "pear" already exists' }),
  },
};
