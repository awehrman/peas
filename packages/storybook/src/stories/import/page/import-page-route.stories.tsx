import React, { ReactNode, useEffect, useState } from "react";

import { FileDropZone } from "@peas/components";
import {
  ImportProvider,
  UploadBatchHistory,
  UploadProgress,
} from "@peas/features";
import type { Meta, StoryObj } from "@storybook/react";

// Mock the server actions
const mockGetImportStats = async (scenario: string = "default") => {
  const scenarios = {
    default: {
      numberOfNotes: 0,
      numberOfIngredients: 0,
      numberOfParsingErrors: 0,
    },
    withData: {
      numberOfNotes: 25,
      numberOfIngredients: 150,
      numberOfParsingErrors: 3,
    },
    large: {
      numberOfNotes: 1250,
      numberOfIngredients: 8500,
      numberOfParsingErrors: 45,
    },
    noErrors: {
      numberOfNotes: 100,
      numberOfIngredients: 500,
      numberOfParsingErrors: 0,
    },
  };

  return scenarios[scenario as keyof typeof scenarios] || scenarios.default;
};

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

// ImportPageRoute component for Storybook
interface ImportPageRouteProps {
  /** Scenario for mock server data */
  scenario?: "default" | "withData" | "large" | "noErrors";
  /** Upload scenario to demonstrate different states */
  uploadScenario?:
    | "initial"
    | "uploading"
    | "success"
    | "failed"
    | "validation-error";
  /** Whether to show loading state */
  isLoading?: boolean;
}

const ImportPageRouteComponent: React.FC<ImportPageRouteProps> = async ({
  scenario = "default",
  uploadScenario = "initial",
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading import stats...</span>
        </div>
      </div>
    );
  }

  const stats = await mockGetImportStats(scenario);

  return (
    <ImportProvider onStatsRefresh={() => mockGetImportStats(scenario)}>
      <ImportPage
        initialNoteCount={stats.numberOfNotes}
        initialIngredientCount={stats.numberOfIngredients}
        initialParsingErrorCount={stats.numberOfParsingErrors}
        scenario={uploadScenario}
      />
    </ImportProvider>
  );
};

// Wrapper to handle async component and mock hooks
const ImportPageRouteWrapper: React.FC<ImportPageRouteProps> = (props) => {
  const [component, setComponent] = useState<ReactNode>(null);

  useEffect(() => {
    const loadComponent = async () => {
      const result = await ImportPageRouteComponent(props);
      setComponent(result);
    };
    loadComponent();
  }, [props.scenario, props.uploadScenario, props.isLoading]);

  return <>{component}</>;
};

const meta = {
  title: "Import/Page/ImportPageRoute",
  component: ImportPageRouteWrapper,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The complete import page route that fetches data from the server and wraps the actual ImportPage component with the full context provider.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    scenario: {
      control: { type: "select" },
      options: ["default", "withData", "large", "noErrors"],
      description: "Scenario for mock server data",
    },
    uploadScenario: {
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
    isLoading: {
      control: "boolean",
      description: "Whether to show loading state",
    },
  },
} satisfies Meta<typeof ImportPageRouteWrapper>;

export default meta;
type Story = StoryObj<typeof ImportPageRouteWrapper>;

export const Initial: Story = {
  args: {
    scenario: "default",
    uploadScenario: "initial",
    isLoading: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Import page route in initial state, ready to accept files.",
      },
    },
  },
};

export const Uploading: Story = {
  args: {
    scenario: "default",
    uploadScenario: "uploading",
    isLoading: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Import page route showing upload in progress with 1 file being processed.",
      },
    },
  },
};

export const UploadSuccess: Story = {
  args: {
    scenario: "default",
    uploadScenario: "success",
    isLoading: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Import page route showing successful upload completion.",
      },
    },
  },
};

export const UploadFailed: Story = {
  args: {
    scenario: "default",
    uploadScenario: "failed",
    isLoading: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Import page route showing failed upload with error message.",
      },
    },
  },
};

export const ValidationError: Story = {
  args: {
    scenario: "default",
    uploadScenario: "validation-error",
    isLoading: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Import page route showing validation error for invalid file types.",
      },
    },
  },
};

export const WithServerData: Story = {
  args: {
    scenario: "withData",
    uploadScenario: "initial",
    isLoading: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Import page route with data fetched from the server, ready for new uploads.",
      },
    },
  },
};

export const LargeDataset: Story = {
  args: {
    scenario: "large",
    uploadScenario: "initial",
    isLoading: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Import page route with a large dataset from the server.",
      },
    },
  },
};

export const Loading: Story = {
  args: {
    scenario: "withData",
    uploadScenario: "initial",
    isLoading: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Import page route showing loading state while fetching server data.",
      },
    },
  },
};
