import { FileInput } from "@peas/components";
import { action } from "@storybook/addon-actions";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Molecules/FileInput",
  component: FileInput,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    onFilesChange: { action: "files-changed" },
    multiple: {
      control: "boolean",
      description: "Whether to allow multiple files",
    },
    allowDirectories: {
      control: "boolean",
      description: "Whether to allow directory selection",
    },
    accept: {
      control: "text",
      description: "Accepted file types (e.g., '.jpg,.png' or 'image/*')",
    },
    disabled: {
      control: "boolean",
      description: "Whether the input is disabled",
    },
    showInput: {
      control: "boolean",
      description: "Whether to show the file input UI controls",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
    id: {
      control: "text",
      description: "Input ID for accessibility",
    },
  },
} satisfies Meta<typeof FileInput>;

export default meta;
type Story = StoryObj<typeof FileInput>;

export const Default: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: false,
    allowDirectories: false,
    disabled: false,
    showInput: false,
    id: "file-input",
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <p className="mb-4 text-sm text-gray-600">
          This is a hidden file input. Use the FileInputField atom for direct
          access.
        </p>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Default file input molecule (hidden by default).",
      },
    },
  },
};

export const withDirectorySelection: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: true,
    allowDirectories: true,
    disabled: false,
    showInput: true,
    id: "file-input-directory",
  },
  parameters: {
    docs: {
      description: {
        story:
          "File input with directory selection enabled and UI controls visible.",
      },
    },
  },
};

export const multipleFiles: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: true,
    allowDirectories: false,
    disabled: false,
    showInput: false,
    id: "file-input-multiple",
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <p className="mb-4 text-sm text-gray-600">
          Configured for multiple file selection (hidden input).
        </p>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "File input configured for multiple file selection.",
      },
    },
  },
};

export const withFileTypes: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: true,
    allowDirectories: true,
    accept: "image/*",
    disabled: false,
    showInput: true,
    id: "file-input-images",
  },
  parameters: {
    docs: {
      description: {
        story:
          "File input that only accepts image files with directory selection.",
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: false,
    allowDirectories: false,
    disabled: true,
    showInput: true,
    id: "file-input-disabled",
  },
  parameters: {
    docs: {
      description: {
        story: "Disabled file input that cannot be interacted with.",
      },
    },
  },
};

export const customStyling: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: true,
    allowDirectories: true,
    disabled: false,
    showInput: true,
    className: "border-2 border-blue-200 rounded-lg p-4",
    id: "file-input-custom",
  },
  parameters: {
    docs: {
      description: {
        story: "File input with custom styling applied.",
      },
    },
  },
};
