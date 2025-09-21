import { ImportFileUpload, ImportUploadProvider } from "@peas/features";
import type { Meta, StoryObj } from "@storybook/react";

// Define the types locally since we can't import from internal paths
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

// Create mock file upload items for different states
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
const successState: UploadState = {
  currentBatch: {
    importId: "success-batch-123",
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

const errorState: UploadState = {
  currentBatch: {
    importId: "error-batch-456",
    createdAt: new Date().toISOString(),
    numberOfFiles: 2,
    directoryName: "Failed Upload",
    errorMessage: "Upload failed due to network error",
    files: [
      createMockFile("1", "recipe1.html", "failed", 50, "Network timeout"),
      createMockFile("2", "recipe2.html", "failed", 0, "File too large"),
    ],
  },
  previousBatches: [],
};

// Wrapper component with provider
const ImportFileUploadWithProvider: React.FC<{
  disabled?: boolean;
  className?: string;
  initialState?: UploadState;
}> = ({ disabled = false, className, initialState }) => {
  return (
    <ImportUploadProvider initialState={initialState}>
      <ImportFileUpload disabled={disabled} className={className} />
    </ImportUploadProvider>
  );
};

const meta = {
  title: "Import/Components/ImportFileUpload",
  component: ImportFileUploadWithProvider,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: "boolean",
    },
    className: {
      control: "text",
    },
    initialState: {
      control: false, // Hide from controls as it's complex
    },
  },
} satisfies Meta<typeof ImportFileUploadWithProvider>;

export default meta;
type Story = StoryObj<typeof ImportFileUploadWithProvider>;

export const Default: Story = {
  args: {
    disabled: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Default file upload component ready to accept files.",
      },
    },
  },
};

export const Success: Story = {
  args: {
    disabled: false,
    initialState: successState,
  },
  parameters: {
    docs: {
      description: {
        story:
          "File upload component showing a successful upload with completed files.",
      },
    },
  },
};

export const Error: Story = {
  args: {
    disabled: false,
    initialState: errorState,
  },
  parameters: {
    docs: {
      description: {
        story:
          "File upload component showing an error state with failed uploads.",
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: "File upload component in disabled state.",
      },
    },
  },
};

export const WithCustomClass: Story = {
  args: {
    disabled: false,
    className: "border-2 border-dashed border-blue-300 rounded-lg p-8",
  },
  parameters: {
    docs: {
      description: {
        story: "File upload component with custom styling.",
      },
    },
  },
};
