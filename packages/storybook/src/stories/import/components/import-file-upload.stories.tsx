import React from "react";

import { ImportFileUpload, ImportProvider } from "@peas/features";
import type { Meta, StoryObj } from "@storybook/react";

// Simple wrapper that just uses the actual ImportFileUpload component
const ImportFileUploadWrapper: React.FC<{
  disabled?: boolean;
  className?: string;
}> = ({ disabled = false, className }) => {
  const mockStatsRefresh = async () => {
    console.log("Stats refresh requested from ImportFileUpload story");
    return {
      numberOfNotes: 0,
      numberOfIngredients: 0,
      numberOfParsingErrors: 0,
    };
  };

  return (
    <ImportProvider onStatsRefresh={mockStatsRefresh}>
      <ImportFileUpload disabled={disabled} className={className} />
    </ImportProvider>
  );
};

const meta = {
  title: "Import/Components/ImportFileUpload",
  component: ImportFileUploadWrapper,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: "boolean",
      description: "Whether the upload is disabled",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof ImportFileUploadWrapper>;

export default meta;
type Story = StoryObj<typeof ImportFileUploadWrapper>;

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
    className: "max-w-md",
  },
  parameters: {
    docs: {
      description: {
        story: "File upload component with custom CSS class applied.",
      },
    },
  },
};
