import { UploadBatchHistory } from "@peas/features";
import type { UploadBatch } from "@peas/features";
import type { Meta, StoryObj } from "@storybook/react";

// Mock data for different scenarios
const mockSuccessfulBatches: UploadBatch[] = [
  {
    importId: "batch-1",
    createdAt: "2024-01-15T10:30:00Z",
    numberOfFiles: 5,
    files: [],
    successMessage: "All files uploaded successfully",
  },
  {
    importId: "batch-2",
    createdAt: "2024-01-15T11:15:00Z",
    numberOfFiles: 12,
    files: [],
    successMessage: "All files uploaded successfully",
  },
];

const mockFailedBatches: UploadBatch[] = [
  {
    importId: "batch-3",
    createdAt: "2024-01-15T12:00:00Z",
    numberOfFiles: 3,
    files: [],
    errorMessage: "Network connection failed",
  },
  {
    importId: "batch-4",
    createdAt: "2024-01-15T12:30:00Z",
    numberOfFiles: 8,
    files: [],
    errorMessage: "Invalid file format detected",
  },
];

const mockMixedBatches: UploadBatch[] = [
  {
    importId: "batch-5",
    createdAt: "2024-01-15T13:00:00Z",
    numberOfFiles: 7,
    files: [],
    successMessage: "All files uploaded successfully",
  },
  {
    importId: "batch-6",
    createdAt: "2024-01-15T13:15:00Z",
    numberOfFiles: 2,
    files: [],
    errorMessage: "File size exceeds limit",
  },
  {
    importId: "batch-7",
    createdAt: "2024-01-15T13:30:00Z",
    numberOfFiles: 15,
    files: [],
    successMessage: "All files uploaded successfully",
  },
];

const meta = {
  title: "Import/Components/UploadBatchHistory",
  component: UploadBatchHistory,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    batches: {
      control: "object",
      description: "Array of upload batches to display",
    },
  },
} satisfies Meta<typeof UploadBatchHistory>;

export default meta;
type Story = StoryObj<typeof UploadBatchHistory>;

export const Default: Story = {
  args: {
    batches: mockSuccessfulBatches,
  },
  parameters: {
    docs: {
      description: {
        story: "Default upload batch history showing successful uploads.",
      },
    },
  },
};

export const Empty: Story = {
  args: {
    batches: [],
  },
  parameters: {
    docs: {
      description: {
        story: "Upload batch history with no batches (component returns null).",
      },
    },
  },
};

export const SuccessfulBatches: Story = {
  args: {
    batches: mockSuccessfulBatches,
  },
  parameters: {
    docs: {
      description: {
        story: "Upload batch history showing only successful uploads.",
      },
    },
  },
};

export const FailedBatches: Story = {
  args: {
    batches: mockFailedBatches,
  },
  parameters: {
    docs: {
      description: {
        story: "Upload batch history showing only failed uploads.",
      },
    },
  },
};

export const MixedBatches: Story = {
  args: {
    batches: mockMixedBatches,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Upload batch history showing a mix of successful and failed uploads.",
      },
    },
  },
};

export const SingleBatch: Story = {
  args: {
    batches: [mockSuccessfulBatches[0]],
  },
  parameters: {
    docs: {
      description: {
        story: "Upload batch history showing a single batch.",
      },
    },
  },
};

export const ManyBatches: Story = {
  args: {
    batches: [
      ...mockSuccessfulBatches,
      ...mockFailedBatches,
      ...mockMixedBatches,
      {
        importId: "batch-8",
        createdAt: "2024-01-15T14:00:00Z",
        numberOfFiles: 1,
        files: [],
        successMessage: "All files uploaded successfully",
      },
      {
        importId: "batch-9",
        createdAt: "2024-01-15T14:15:00Z",
        numberOfFiles: 20,
        files: [],
        errorMessage: "Server timeout",
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          "Upload batch history showing many batches to test scrolling behavior.",
      },
    },
  },
};
