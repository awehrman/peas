import { Alert, AlertDescription, AlertTitle } from "@peas/components";
import type { Meta, StoryObj } from "@storybook/react";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";

const meta = {
  title: "UI/Alert",
  component: Alert,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive"],
      description: "Visual variant of the alert",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {
  args: {
    variant: "default",
  },
  render: (args) => (
    <Alert {...args}>
      <Info className="h-4 w-4" />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>
        This is a default alert with some information for the user.
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Default alert with information variant.",
      },
    },
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
  },
  render: (args) => (
    <Alert {...args}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Something went wrong. Please try again or contact support.
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Destructive alert for error messages.",
      },
    },
  },
};

export const Success: Story = {
  args: {
    variant: "default",
  },
  render: (args) => (
    <Alert {...args} className="border-green-200 bg-green-50 text-green-800">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800">Success</AlertTitle>
      <AlertDescription className="text-green-700">
        Your action was completed successfully!
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Success alert with custom green styling.",
      },
    },
  },
};

export const Warning: Story = {
  args: {
    variant: "default",
  },
  render: (args) => (
    <Alert {...args} className="border-yellow-200 bg-yellow-50 text-yellow-800">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">Warning</AlertTitle>
      <AlertDescription className="text-yellow-700">
        Please review your input before proceeding.
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Warning alert with custom yellow styling.",
      },
    },
  },
};

export const withoutTitle: Story = {
  args: {
    variant: "default",
  },
  render: (args) => (
    <Alert {...args}>
      <Info className="h-4 w-4" />
      <AlertDescription>
        This alert only has a description without a title.
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Alert with only a description, no title.",
      },
    },
  },
};

export const withoutIcon: Story = {
  args: {
    variant: "default",
  },
  render: (args) => (
    <Alert {...args}>
      <AlertTitle>No Icon</AlertTitle>
      <AlertDescription>
        This alert doesn't have an icon, just text content.
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Alert without an icon, just title and description.",
      },
    },
  },
};

export const longContent: Story = {
  args: {
    variant: "default",
  },
  render: (args) => (
    <Alert {...args}>
      <Info className="h-4 w-4" />
      <AlertTitle>Important Information</AlertTitle>
      <AlertDescription>
        This is a longer alert message that contains more detailed information
        about what the user needs to know. It might span multiple lines and
        provide comprehensive guidance or context for the current situation. The
        alert should handle this content gracefully and maintain good
        readability.
      </AlertDescription>
    </Alert>
  ),
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Alert with longer content to test text wrapping and layout.",
      },
    },
  },
};

export const customStyling: Story = {
  args: {
    variant: "default",
  },
  render: (args) => (
    <Alert {...args} className="border-blue-200 bg-blue-50 text-blue-800">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-800">Custom Styled</AlertTitle>
      <AlertDescription className="text-blue-700">
        This alert has custom blue styling applied.
      </AlertDescription>
    </Alert>
  ),
  parameters: {
    docs: {
      description: {
        story: "Alert with custom styling applied via className.",
      },
    },
  },
};
