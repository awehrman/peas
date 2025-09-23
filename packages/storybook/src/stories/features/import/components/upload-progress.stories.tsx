import { UploadProgress } from "@peas/features";
import type { UploadBatch } from "@peas/features";
import type { Meta, StoryObj } from "@storybook/react";

// Mock data for different scenarios
const mockSmallBatch: UploadBatch = {
  importId: "batch-1",
  createdAt: "2024-01-15T10:30:00Z",
  numberOfFiles: 3,
  files: [],
};

const mockMediumBatch: UploadBatch = {
  importId: "batch-2",
  createdAt: "2024-01-15T11:15:00Z",
  numberOfFiles: 12,
  files: [],
};

const mockLargeBatch: UploadBatch = {
  importId: "batch-3",
  createdAt: "2024-01-15T12:00:00Z",
  numberOfFiles: 50,
  files: [],
};

const mockSingleFileBatch: UploadBatch = {
  importId: "batch-4",
  createdAt: "2024-01-15T12:30:00Z",
  numberOfFiles: 1,
  files: [],
};

const mockVeryLargeBatch: UploadBatch = {
  importId: "batch-5",
  createdAt: "2024-01-15T13:00:00Z",
  numberOfFiles: 150,
  files: [],
};

const meta = {
  title: "Import/Components/UploadProgress",
  component: UploadProgress,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    batch: {
      control: "object",
      description: "Upload batch to display progress for",
    },
  },
} satisfies Meta<typeof UploadProgress>;

export default meta;
type Story = StoryObj<typeof UploadProgress>;

export const Default: Story = {
  args: {
    batch: mockMediumBatch,
  },
  parameters: {
    docs: {
      description: {
        story: "Default upload progress display showing a medium-sized batch.",
      },
    },
  },
};

export const SmallBatch: Story = {
  args: {
    batch: mockSmallBatch,
  },
  parameters: {
    docs: {
      description: {
        story: "Upload progress display for a small batch of files.",
      },
    },
  },
};

export const SingleFile: Story = {
  args: {
    batch: mockSingleFileBatch,
  },
  parameters: {
    docs: {
      description: {
        story: "Upload progress display for a single file upload.",
      },
    },
  },
};

export const LargeBatch: Story = {
  args: {
    batch: mockLargeBatch,
  },
  parameters: {
    docs: {
      description: {
        story: "Upload progress display for a large batch of files.",
      },
    },
  },
};

export const VeryLargeBatch: Story = {
  args: {
    batch: mockVeryLargeBatch,
  },
  parameters: {
    docs: {
      description: {
        story: "Upload progress display for a very large batch of files.",
      },
    },
  },
};

export const ZeroFiles: Story = {
  args: {
    batch: {
      importId: "batch-6",
      createdAt: "2024-01-15T13:30:00Z",
      numberOfFiles: 0,
      files: [],
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Upload progress display for a batch with zero files (edge case).",
      },
    },
  },
};
