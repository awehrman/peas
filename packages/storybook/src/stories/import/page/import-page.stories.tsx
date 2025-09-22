import React from "react";

import { FileDropZone } from "@peas/components";
import {
  ImportProvider,
  UploadBatchHistory,
  UploadProgress,
} from "@peas/features";
import type { Meta, StoryObj } from "@storybook/react";

// Mock the useInitialization hook
const mockUseInitialization = (props: {
  initialNoteCount: number;
  initialIngredientCount: number;
  initialParsingErrorCount: number;
}) => {
  console.log("useInitialization called with:", props);
};

// Mock the useFileUpload hook to simulate different upload states
const mockUseFileUpload = (scenario: string) => {
  const createMockFile = (
    id: string,
    fileName: string,
    status: "pending" | "uploading" | "completed" | "failed",
    progress: number = 0,
    error?: string
  ) => ({
    id,
    file: new File([""], fileName, { type: "text/html" }),
    status,
    progress,
    error,
  });

  switch (scenario) {
    case "uploading":
      return {
        state: {
          currentBatch: {
            importId: "uploading-batch-123",
            createdAt: new Date().toISOString(),
            numberOfFiles: 1,
            directoryName: "My Recipes",
            files: [
              createMockFile("file-1", "chocolate-cake.html", "uploading", 45),
            ],
          },
          previousBatches: [],
        },
        validationError: null,
        isProcessing: true,
        handleFilesChange: () => {},
      };

    case "success":
      return {
        state: {
          currentBatch: undefined,
          previousBatches: [
            {
              importId: "success-batch-456",
              createdAt: new Date().toISOString(),
              numberOfFiles: 1,
              directoryName: "Recipe Collection",
              successMessage: "Successfully uploaded 1 file!",
              files: [
                createMockFile(
                  "file-1",
                  "chocolate-cake.html",
                  "completed",
                  100
                ),
              ],
            },
          ],
        },
        validationError: null,
        isProcessing: false,
        handleFilesChange: () => {},
      };

    case "failed":
      return {
        state: {
          currentBatch: undefined,
          previousBatches: [
            {
              importId: "failed-batch-789",
              createdAt: new Date().toISOString(),
              numberOfFiles: 1,
              directoryName: "Failed Upload",
              errorMessage: "Upload failed due to network error",
              files: [
                createMockFile(
                  "file-1",
                  "recipe1.html",
                  "failed",
                  0,
                  "Network timeout"
                ),
              ],
            },
          ],
        },
        validationError: null,
        isProcessing: false,
        handleFilesChange: () => {},
      };

    case "validation-error":
      return {
        state: {
          currentBatch: undefined,
          previousBatches: [],
        },
        validationError:
          "Invalid file type. Please select HTML files and associated images.",
        isProcessing: false,
        handleFilesChange: () => {},
      };

    default: // initial
      return {
        state: {
          currentBatch: undefined,
          previousBatches: [],
        },
        validationError: null,
        isProcessing: false,
        handleFilesChange: () => {},
      };
  }
};

// Mock ImportFileUpload component that uses our mock data
interface MockImportFileUploadProps {
  scenario: string;
}

const MockImportFileUpload: React.FC<MockImportFileUploadProps> = ({
  scenario,
}) => {
  const mockData = mockUseFileUpload(scenario);

  const uploadState = mockData.state.currentBatch ? "uploading" : "initial";
  const description =
    uploadState === "uploading"
      ? "Processing your files..."
      : "Select an Evernote export directory.";
  const error =
    mockData.validationError ||
    (mockData.state.currentBatch as any)?.errorMessage;

  return (
    <div>
      <FileDropZone
        onFilesChange={() => {}}
        multiple
        allowDirectories
        disabled={mockData.isProcessing}
        description={description}
        error={error}
        isProcessing={mockData.isProcessing}
      />

      {/* Upload Progress */}
      {mockData.state.currentBatch && (
        <UploadProgress batch={mockData.state.currentBatch} />
      )}

      {/* Previous Batches */}
      <UploadBatchHistory batches={mockData.state.previousBatches} />
    </div>
  );
};

// Local ImportPage component (same as the one in web app)
interface ImportPageProps {
  initialNoteCount?: number;
  initialIngredientCount?: number;
  initialParsingErrorCount?: number;
  scenario?: string;
}

const ImportPage: React.FC<ImportPageProps> = ({
  initialNoteCount = 0,
  initialIngredientCount = 0,
  initialParsingErrorCount = 0,
  scenario = "initial",
}) => {
  // Mock the useInitialization hook
  mockUseInitialization({
    initialNoteCount,
    initialIngredientCount,
    initialParsingErrorCount,
  });

  return (
    <div className="container mx-auto p-6">
      <div className="grid gap-6">
        {/* Import Notes Section */}
        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Import Notes</h2>
          <MockImportFileUpload scenario={scenario} />
        </div>
      </div>
    </div>
  );
};

// Wrapper component that provides the context
const ImportPageWithContext: React.FC<{
  initialNoteCount?: number;
  initialIngredientCount?: number;
  initialParsingErrorCount?: number;
  scenario?: string;
}> = ({
  initialNoteCount = 0,
  initialIngredientCount = 0,
  initialParsingErrorCount = 0,
  scenario = "initial",
}) => {
  const mockStatsRefresh = async () => {
    console.log("Stats refresh requested from ImportPage story");
    return {
      numberOfNotes: initialNoteCount,
      numberOfIngredients: initialIngredientCount,
      numberOfParsingErrors: initialParsingErrorCount,
    };
  };

  return (
    <ImportProvider onStatsRefresh={mockStatsRefresh}>
      <ImportPage
        initialNoteCount={initialNoteCount}
        initialIngredientCount={initialIngredientCount}
        initialParsingErrorCount={initialParsingErrorCount}
        scenario={scenario}
      />
    </ImportProvider>
  );
};

const meta = {
  title: "Import/Page/ImportPage",
  component: ImportPageWithContext,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    initialNoteCount: {
      control: { type: "number", min: 0, max: 1000 },
      description: "Initial number of notes from server",
    },
    initialIngredientCount: {
      control: { type: "number", min: 0, max: 1000 },
      description: "Initial number of ingredients from server",
    },
    initialParsingErrorCount: {
      control: { type: "number", min: 0, max: 100 },
      description: "Initial number of parsing errors from server",
    },
    scenario: {
      control: { type: "select" },
      options: [
        "initial",
        "uploading",
        "success",
        "failed",
        "validation-error",
      ],
      description: "Upload scenario to demonstrate different states",
    },
  },
} satisfies Meta<typeof ImportPageWithContext>;

export default meta;
type Story = StoryObj<typeof ImportPageWithContext>;

export const Default: Story = {
  args: {
    initialNoteCount: 0,
    initialIngredientCount: 0,
    initialParsingErrorCount: 0,
    scenario: "initial",
  },
  parameters: {
    docs: {
      description: {
        story: "Import page in initial state, ready to accept files.",
      },
    },
  },
};

export const Uploading: Story = {
  args: {
    initialNoteCount: 0,
    initialIngredientCount: 0,
    initialParsingErrorCount: 0,
    scenario: "uploading",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Import page showing upload in progress with 1 file being processed.",
      },
    },
  },
};

export const UploadSuccess: Story = {
  args: {
    initialNoteCount: 0,
    initialIngredientCount: 0,
    initialParsingErrorCount: 0,
    scenario: "success",
  },
  parameters: {
    docs: {
      description: {
        story: "Import page showing successful upload completion.",
      },
    },
  },
};

export const UploadFailed: Story = {
  args: {
    initialNoteCount: 0,
    initialIngredientCount: 0,
    initialParsingErrorCount: 0,
    scenario: "failed",
  },
  parameters: {
    docs: {
      description: {
        story: "Import page showing failed upload with error message.",
      },
    },
  },
};

export const ValidationError: Story = {
  args: {
    initialNoteCount: 0,
    initialIngredientCount: 0,
    initialParsingErrorCount: 0,
    scenario: "validation-error",
  },
  parameters: {
    docs: {
      description: {
        story: "Import page showing validation error for invalid file types.",
      },
    },
  },
};
