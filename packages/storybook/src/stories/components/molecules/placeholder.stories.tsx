import { Placeholder } from "@peas/components";
import { Button } from "@peas/components";
import type { Meta, StoryObj } from "@storybook/react";
import { AlertCircle, CheckCircle, File, Upload } from "lucide-react";

const meta = {
  title: "Molecules/Placeholder",
  component: Placeholder,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    label: {
      control: "text",
      description: "Label text or React node to display",
    },
    icon: {
      control: false,
      description: "Icon element to display",
    },
    button: {
      control: false,
      description: "Button element to display",
    },
    buttonSize: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size of the button",
    },
  },
} satisfies Meta<typeof Placeholder>;

export default meta;
type Story = StoryObj<typeof Placeholder>;

export const Default: Story = {
  args: {
    label: "No content available",
    icon: null,
    button: null,
    buttonSize: "md",
  },
  parameters: {
    docs: {
      description: {
        story: "Default placeholder with just a label.",
      },
    },
  },
};

export const withIcon: Story = {
  args: {
    label: "Upload your files",
    icon: <Upload className="text-gray-400" />,
    button: null,
    buttonSize: "md",
  },
  parameters: {
    docs: {
      description: {
        story: "Placeholder with an icon and label.",
      },
    },
  },
};

export const withButton: Story = {
  args: {
    label: "Get started",
    icon: <File className="text-blue-500" />,
    button: <Button>Upload Files</Button>,
    buttonSize: "md",
  },
  parameters: {
    docs: {
      description: {
        story: "Placeholder with icon, label, and button.",
      },
    },
  },
};

export const smallButton: Story = {
  args: {
    label: "Quick action",
    icon: <CheckCircle className="text-green-500" />,
    button: <Button size="sm">Action</Button>,
    buttonSize: "sm",
  },
  parameters: {
    docs: {
      description: {
        story: "Placeholder with a small button.",
      },
    },
  },
};

export const largeButton: Story = {
  args: {
    label: "Important action",
    icon: <AlertCircle className="text-orange-500" />,
    button: <Button size="lg">Get Started</Button>,
    buttonSize: "lg",
  },
  parameters: {
    docs: {
      description: {
        story: "Placeholder with a large button.",
      },
    },
  },
};

export const customContent: Story = {
  args: {
    label: (
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Welcome!</h3>
        <p className="text-gray-600">Start by uploading your first file</p>
      </div>
    ),
    icon: <Upload className="text-blue-500" />,
    button: <Button variant="outline">Choose Files</Button>,
    buttonSize: "md",
  },
  parameters: {
    docs: {
      description: {
        story: "Placeholder with custom React content as label.",
      },
    },
  },
};

export const inContainer: Story = {
  args: {
    label: "Drop files here",
    icon: <Upload className="text-gray-400" />,
    button: <Button variant="outline">Browse Files</Button>,
    buttonSize: "md",
  },
  decorators: [
    (Story) => (
      <div className="h-64 w-96 border-2 border-dashed border-gray-300 rounded-lg">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Placeholder displayed within a container to show its centering behavior.",
      },
    },
  },
};
