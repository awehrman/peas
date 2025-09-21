import { ImportUploadProvider, UploadProgress } from "@peas/features";
import { createMockUploadBatch } from "@peas/features/test-utils";
import type { Meta, StoryObj } from "@storybook/react";

// Wrapper component with provider and mock batch
const UploadProgressWithProvider: React.FC<{
  withError?: boolean;
  withSuccess?: boolean;
}> = ({ withError = false, withSuccess = false }) => {
  const mockBatch = createMockUploadBatch({
    numberOfFiles: 3,
    ...(withError && { errorMessage: "Upload failed due to network timeout" }),
    ...(withSuccess && { successMessage: "Upload completed successfully" }),
  });

  return (
    <ImportUploadProvider>
      <div className="w-96">
        <UploadProgress batch={mockBatch} />
      </div>
    </ImportUploadProvider>
  );
};

const meta = {
  title: "Import/Components/UploadProgress",
  component: UploadProgressWithProvider,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    withError: {
      control: "boolean",
    },
    withSuccess: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof UploadProgressWithProvider>;

export default meta;
type Story = StoryObj<typeof UploadProgressWithProvider>;

export const Default: Story = {
  args: {
    withError: false,
    withSuccess: false,
  },
};

export const WithSuccess: Story = {
  args: {
    withError: false,
    withSuccess: true,
  },
};

export const WithError: Story = {
  args: {
    withError: true,
    withSuccess: false,
  },
};
