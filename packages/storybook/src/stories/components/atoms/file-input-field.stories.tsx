import { FileInputField } from "@peas/components";
import { action } from "@storybook/addon-actions";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Atoms/FileInputField",
  component: FileInputField,
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
    accept: {
      control: "text",
      description: "Accepted file types (e.g., '.jpg,.png' or 'image/*')",
    },
    disabled: {
      control: "boolean",
      description: "Whether the input is disabled",
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
} satisfies Meta<typeof FileInputField>;

export default meta;
type Story = StoryObj<typeof FileInputField>;

export const Default: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: false,
    disabled: false,
    id: "file-input-field",
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <label
          htmlFor="file-input-field"
          className="block text-sm font-medium mb-2"
        >
          Choose a file:
        </label>
        <input
          type="button"
          value="Select File"
          onClick={() => document.getElementById("file-input-field")?.click()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
        />
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Default file input field for single file selection.",
      },
    },
  },
};

export const multipleFiles: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: true,
    disabled: false,
    id: "file-input-field-multiple",
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <label
          htmlFor="file-input-field-multiple"
          className="block text-sm font-medium mb-2"
        >
          Choose multiple files:
        </label>
        <input
          type="button"
          value="Select Files"
          onClick={() =>
            document.getElementById("file-input-field-multiple")?.click()
          }
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
        />
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "File input field that allows multiple file selection.",
      },
    },
  },
};

export const withFileTypes: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: true,
    accept: "image/*",
    disabled: false,
    id: "file-input-field-images",
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <label
          htmlFor="file-input-field-images"
          className="block text-sm font-medium mb-2"
        >
          Choose images only:
        </label>
        <input
          type="button"
          value="Select Images"
          onClick={() =>
            document.getElementById("file-input-field-images")?.click()
          }
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
        />
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "File input field that only accepts image files.",
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: false,
    disabled: true,
    id: "file-input-field-disabled",
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <label
          htmlFor="file-input-field-disabled"
          className="block text-sm font-medium mb-2 text-gray-500"
        >
          Disabled file input:
        </label>
        <input
          type="button"
          value="Select File (Disabled)"
          disabled
          className="px-4 py-2 bg-gray-300 text-gray-500 rounded cursor-not-allowed"
        />
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Disabled file input field that cannot be interacted with.",
      },
    },
  },
};

export const directorySelection: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: true,
    disabled: false,
    id: "file-input-field-directory",
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <label
          htmlFor="file-input-field-directory-directory"
          className="block text-sm font-medium mb-2"
        >
          Choose a directory:
        </label>
        <input
          type="button"
          value="Select Directory"
          onClick={() =>
            document
              .getElementById("file-input-field-directory-directory")
              ?.click()
          }
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer"
        />
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "File input field configured for directory selection using webkitdirectory.",
      },
    },
  },
};
