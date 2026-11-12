import React from "react";

import {
  type ActivityState,
  type ImportCard,
  ImportFileUpload,
  ImportOverview,
  ImportProvider,
  type ImportStatsState,
  type UploadState,
  buildImportRows,
  createInitialCard,
  summarizeSteps,
} from "@peas/features";
import type { Meta, StoryObj } from "@storybook/react";

const RECIPES = [
  ["Venison stew", "https://www.seriouseats.com/venison-stew"],
  ["Brown butter cornbread", "https://cooking.nytimes.com/recipes/cornbread"],
  ["Charred leeks with romesco", "Salt Fat Acid Heat, p. 212"],
  ["Lemon olive oil cake", "https://www.bonappetit.com/recipe/lemon-cake"],
  ["Smoky black bean soup", "https://www.budgetbytes.com/black-bean-soup"],
  ["Miso glazed eggplant", "https://www.justonecookbook.com/miso-eggplant"],
  ["Chicken adobo", "https://www.kawalingpinoy.com/chicken-adobo"],
  ["Shakshuka", "https://www.seriouseats.com/shakshuka"],
  ["Pickled red onions", undefined],
  ["Sourdough focaccia", "https://www.kingarthurbaking.com/recipes/focaccia"],
  ["Pea and mint risotto", "https://www.bbcgoodfood.com/recipes/pea-risotto"],
  ["Gochujang noodles", "https://www.maangchi.com/recipe/gochujang-noodles"],
] as const;

const THUMBNAIL_COLORS = ["8fbf9f", "e0b15a", "c96f53", "7a9cc6", "a37fb5"];

function thumbnail(index: number): string | undefined {
  if (index % 4 === 3) return undefined;
  const color = THUMBNAIL_COLORS[index % THUMBNAIL_COLORS.length];
  return `https://placehold.co/80x80/${color}/ffffff?text=${index + 1}`;
}

type Stage = "imported" | "ingredients" | "images" | "failed" | "queued";

function cardAt(index: number, stage: Stage): ImportCard | undefined {
  if (stage === "queued") return undefined;

  const [title, source] = RECIPES[index % RECIPES.length]!;
  const card: ImportCard = {
    ...createInitialCard(`import-${index}`, `note-${index}`),
    title,
    source,
    thumbnailUrl: stage === "imported" ? thumbnail(index) : undefined,
    isComplete: stage === "imported",
  };
  const done = { started: true, completed: true, hasError: false };
  card.status.cleanedNote = done;
  card.status.savedNote = done;

  if (stage === "ingredients") {
    card.status.ingredientProcessing = {
      started: true,
      completed: false,
      hasError: false,
      processedSteps: 4 + (index % 6),
      steps: 14,
    };
  }
  if (stage === "images") {
    card.status.ingredientProcessing = done;
    card.status.instructionProcessing = done;
    card.status.connectingSource = done;
    card.status.addingImages = {
      started: true,
      completed: false,
      hasError: false,
      processedSteps: 1,
      steps: 3,
    };
  }
  if (stage === "failed") {
    card.status.ingredientProcessing = {
      started: true,
      completed: false,
      hasError: true,
      errorMessage: 'Could not parse "a knob of butter, softened"',
    };
  }
  return card;
}

function buildScenario(stages: Stage[]): { uploads: UploadState; activity: ActivityState } {
  const cards = stages
    .map((stage, index) => cardAt(index, stage))
    .filter((card): card is ImportCard => card !== undefined);

  return {
    uploads: {
      previousBatches: stages.map((_, index) => ({
        importId: `import-${index}`,
        createdAt: new Date().toISOString(),
        numberOfFiles: 2,
        files: [],
        directoryName: RECIPES[index % RECIPES.length]![0],
      })),
    },
    activity: {
      cardIds: cards.map((card) => card.id),
      cardsById: Object.fromEntries(cards.map((card) => [card.id, card])),
    },
  };
}

const LIBRARY: ImportStatsState = {
  numberOfNotes: 1284,
  numberOfIngredients: 9312,
  numberOfParsingErrors: 41,
};

const SCENARIOS: Record<string, Stage[]> = {
  midImport: [
    ...Array<Stage>(14).fill("imported"),
    "failed",
    "images",
    "ingredients",
    "ingredients",
    ...Array<Stage>(8).fill("queued"),
  ],
  finished: Array<Stage>(20).fill("imported"),
  empty: [],
};

interface ImportPageStoryProps {
  scenario: keyof typeof SCENARIOS;
}

function ImportPageStory({ scenario }: ImportPageStoryProps) {
  const { uploads, activity } = buildScenario(SCENARIOS[scenario] ?? []);
  const rows = buildImportRows(uploads, activity);

  return (
    <ImportProvider onStatsRefresh={async () => LIBRARY}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-8">
        <ImportFileUpload />
        <ImportOverview rows={rows} steps={summarizeSteps(activity)} library={LIBRARY} />
      </div>
    </ImportProvider>
  );
}

const meta = {
  title: "Import/Page/ImportPage",
  component: ImportPageStory,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  argTypes: {
    scenario: {
      control: { type: "select" },
      options: Object.keys(SCENARIOS),
    },
  },
} satisfies Meta<typeof ImportPageStory>;

export default meta;
type Story = StoryObj<typeof ImportPageStory>;

export const MidImport: Story = {
  args: { scenario: "midImport" },
  parameters: {
    docs: {
      description: {
        story: "A large export partway through: one note needs a look, a few are importing, the rest wait in the queue.",
      },
    },
  },
};

export const Finished: Story = {
  args: { scenario: "finished" },
};

export const Empty: Story = {
  args: { scenario: "empty" },
};
