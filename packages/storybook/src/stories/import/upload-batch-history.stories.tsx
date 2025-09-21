import { ImportUploadProvider, UploadBatchHistory } from "@peas/features";
import { createMockUploadBatch } from "@peas/features/test-utils";
import type { Meta, StoryObj } from "@storybook/react";

// Wrapper component with provider and mock batches
const UploadBatchHistoryWithProvider: React.FC<{
  batchCount?: number;
  hasFailures?: boolean;
}> = ({ batchCount = 3, hasFailures = false }) => {
  const mockBatches = Array.from({ length: batchCount }, (_, index) => {
    const shouldFail = hasFailures && index === 1;
    return createMockUploadBatch({
      numberOfFiles: 3 + index,
      ...(shouldFail && { errorMessage: `Batch ${index + 1} failed` }),
    });
  });

  return (
    <ImportUploadProvider>
      <div className="w-96">
        <UploadBatchHistory batches={mockBatches} />
      </div>
    </ImportUploadProvider>
  );
};

const meta = {
  title: "Import/Components/UploadBatchHistory",
  component: UploadBatchHistoryWithProvider,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    batchCount: {
      control: { type: "range", min: 0, max: 10, step: 1 },
    },
    hasFailures: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof UploadBatchHistoryWithProvider>;

export default meta;
type Story = StoryObj<typeof UploadBatchHistoryWithProvider>;

export const Empty: Story = {
  args: {
    batchCount: 0,
  },
};

export const SingleBatch: Story = {
  args: {
    batchCount: 1,
    hasFailures: false,
  },
};

export const MultipleBatches: Story = {
  args: {
    batchCount: 5,
    hasFailures: false,
  },
};

export const WithFailures: Story = {
  args: {
    batchCount: 4,
    hasFailures: true,
  },
};
