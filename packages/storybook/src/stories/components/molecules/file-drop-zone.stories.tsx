import { FileDropZone } from "@peas/components";
import { action } from "@storybook/addon-actions";
import type { Meta, StoryObj } from "@storybook/react";
import { Folder } from "lucide-react";

const meta = {
  title: "Molecules/FileDropZone",
  component: FileDropZone,
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
    disabled: {
      control: "boolean",
      description: "Whether the drop zone is disabled",
    },
    title: {
      control: "text",
      description: "Title for the drop zone",
    },
    description: {
      control: "text",
      description: "Description for the drop zone",
    },
    error: {
      control: "text",
      description: "Error message to display",
    },
    isProcessing: {
      control: "boolean",
      description: "Whether files are currently being processed",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof FileDropZone>;

export default meta;
type Story = StoryObj<typeof FileDropZone>;

export const Default: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: true,
    allowDirectories: true,
    disabled: false,
    description: "Drop or choose files",
    isProcessing: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Default file drop zone with drag and drop functionality.",
      },
    },
  },
};

export const singleFile: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: false,
    allowDirectories: false,
    disabled: false,
    description: "Drop or choose a single file",
    isProcessing: false,
  },
  parameters: {
    docs: {
      description: {
        story: "File drop zone configured for single file selection only.",
      },
    },
  },
};

export const filesOnly: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: true,
    allowDirectories: false,
    disabled: false,
    description: "Drop or choose files (no directories)",
    isProcessing: false,
  },
  parameters: {
    docs: {
      description: {
        story: "File drop zone that only accepts files, not directories.",
      },
    },
  },
};

export const withError: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: true,
    allowDirectories: true,
    disabled: false,
    description: "Drop or choose files",
    error: "Failed to upload files. Please try again.",
    isProcessing: false,
  },
  parameters: {
    docs: {
      description: {
        story: "File drop zone displaying an error message.",
      },
    },
  },
};

export const Processing: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: true,
    allowDirectories: true,
    disabled: false,
    description: "Drop or choose files",
    isProcessing: true,
  },
  parameters: {
    docs: {
      description: {
        story: "File drop zone in processing state with disabled interactions.",
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: true,
    allowDirectories: true,
    disabled: true,
    description: "Drop or choose files",
    isProcessing: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Disabled file drop zone that cannot be interacted with.",
      },
    },
  },
};

export const customDescription: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: true,
    allowDirectories: true,
    disabled: false,
    description: (
      <div className="text-center">
        <Folder className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">
          Drag and drop your files here, or click to browse
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supports images, documents, and folders
        </p>
      </div>
    ),
    isProcessing: false,
  },
  parameters: {
    docs: {
      description: {
        story: "File drop zone with custom React content as description.",
      },
    },
  },
};

export const largeSize: Story = {
  args: {
    onFilesChange: action("files-changed"),
    multiple: true,
    allowDirectories: true,
    disabled: false,
    description: "Drop or choose files",
    isProcessing: false,
    className: "min-h-64",
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-2xl">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Large file drop zone for better visibility and interaction.",
      },
    },
  },
};
