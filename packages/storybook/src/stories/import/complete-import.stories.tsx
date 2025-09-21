import React from "react";

import {
  ImportFileUpload,
  ImportProvider,
  ImportUploadProvider,
} from "@peas/features";
import type { Meta, StoryObj } from "@storybook/react";

// Define types locally for mock states
interface FileUploadItem {
  id: string;
  file: File;
  status: "pending" | "uploading" | "completed" | "failed";
  progress: number;
  error?: string;
}

interface UploadBatch {
  importId: string;
  createdAt: string;
  numberOfFiles: number;
  files: FileUploadItem[];
  directoryName?: string;
  successMessage?: string;
  errorMessage?: string;
}

interface UploadState {
  currentBatch?: UploadBatch;
  previousBatches: UploadBatch[];
}

// Create mock file upload items
const createMockFile = (
  id: string,
  fileName: string,
  status: FileUploadItem["status"],
  progress: number = 0,
  error?: string
): FileUploadItem => ({
  id,
  file: new File([""], fileName, { type: "text/html" }),
  status,
  progress,
  error,
});

// Mock states for different scenarios
const pendingUploadState: UploadState = {
  currentBatch: {
    importId: "pending-batch-123",
    createdAt: new Date().toISOString(),
    numberOfFiles: 3,
    directoryName: "Recipe Collection",
    files: [
      createMockFile("1", "recipe1.html", "uploading", 45),
      createMockFile("2", "recipe2.html", "pending", 0),
      createMockFile("3", "recipe3.html", "pending", 0),
    ],
  },
  previousBatches: [],
};

const successfulUploadState: UploadState = {
  currentBatch: {
    importId: "success-batch-456",
    createdAt: new Date().toISOString(),
    numberOfFiles: 3,
    directoryName: "Recipe Collection",
    successMessage: "Successfully uploaded 3 files!",
    files: [
      createMockFile("1", "recipe1.html", "completed", 100),
      createMockFile("2", "recipe2.html", "completed", 100),
      createMockFile("3", "recipe3.html", "completed", 100),
    ],
  },
  previousBatches: [],
};

const errorUploadState: UploadState = {
  currentBatch: {
    importId: "error-batch-789",
    createdAt: new Date().toISOString(),
    numberOfFiles: 3,
    directoryName: "Failed Upload",
    errorMessage: "Upload failed due to network error",
    files: [
      createMockFile("1", "recipe1.html", "failed", 50, "Network timeout"),
      createMockFile("2", "recipe2.html", "failed", 0, "File too large"),
      createMockFile("3", "recipe3.html", "completed", 100),
    ],
  },
  previousBatches: [],
};

// Complete import component with different states
const CompleteImportDemo: React.FC<{ initialUploadState?: UploadState }> = ({
  initialUploadState,
}) => {
  const handleStatsRefresh = async () => {
    // Mock stats refresh
    return {
      numberOfIngredients: 75,
      numberOfNotes: 15,
      numberOfParsingErrors: 2,
    };
  };

  return (
    <ImportProvider onStatsRefresh={handleStatsRefresh}>
      <ImportUploadProvider initialState={initialUploadState}>
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-center">Recipe Import</h1>
          <p className="text-gray-600 text-center">
            Upload HTML recipe files and associated images to import them into
            your collection.
          </p>

          <ImportFileUpload />
        </div>
      </ImportUploadProvider>
    </ImportProvider>
  );
};

const meta = {
  title: "Import/Complete Import",
  component: CompleteImportDemo,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Complete import component with all providers and contexts integrated. This demonstrates the full import workflow from file selection to completion.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    initialUploadState: {
      control: false, // Hide from controls as it's complex
    },
  },
} satisfies Meta<typeof CompleteImportDemo>;

export default meta;
type Story = StoryObj<typeof CompleteImportDemo>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: "Default complete import interface ready to accept files.",
      },
    },
  },
};

export const PendingUpload: Story = {
  args: {
    initialUploadState: pendingUploadState,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Complete import interface showing files currently being uploaded with progress indicators.",
      },
    },
  },
};

export const SuccessfulUpload: Story = {
  args: {
    initialUploadState: successfulUploadState,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Complete import interface showing a successful upload with all files completed.",
      },
    },
  },
};

export const ErrorUpload: Story = {
  args: {
    initialUploadState: errorUploadState,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Complete import interface showing upload errors with failed files and error messages.",
      },
    },
  },
};
