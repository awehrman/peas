import { Input } from "@peas/components";
import { Label } from "@peas/components";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "UI/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "tel", "url", "search"],
      description: "Input type",
    },
    placeholder: {
      control: "text",
      description: "Placeholder text",
    },
    disabled: {
      control: "boolean",
      description: "Whether the input is disabled",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
    value: {
      control: "text",
      description: "Input value",
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    type: "text",
    placeholder: "Enter text...",
  },
  parameters: {
    docs: {
      description: {
        story: "Default text input with placeholder.",
      },
    },
  },
};

export const withLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="input-with-label">Email</Label>
      <Input
        id="input-with-label"
        type="email"
        placeholder="Enter your email"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Input with a label for better accessibility.",
      },
    },
  },
};

export const Email: Story = {
  args: {
    type: "email",
    placeholder: "Enter your email address",
  },
  parameters: {
    docs: {
      description: {
        story: "Email input with email validation.",
      },
    },
  },
};

export const Password: Story = {
  args: {
    type: "password",
    placeholder: "Enter your password",
  },
  parameters: {
    docs: {
      description: {
        story: "Password input with hidden text.",
      },
    },
  },
};

export const Number: Story = {
  args: {
    type: "number",
    placeholder: "Enter a number",
  },
  parameters: {
    docs: {
      description: {
        story: "Number input for numeric values.",
      },
    },
  },
};

export const Search: Story = {
  args: {
    type: "search",
    placeholder: "Search...",
  },
  parameters: {
    docs: {
      description: {
        story: "Search input with search styling.",
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    type: "text",
    placeholder: "Disabled input",
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Disabled input that cannot be interacted with.",
      },
    },
  },
};

export const WithValue: Story = {
  args: {
    type: "text",
    value: "Pre-filled value",
  },
  parameters: {
    docs: {
      description: {
        story: "Input with a pre-filled value.",
      },
    },
  },
};

export const formExample: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" type="text" placeholder="Enter your full name" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input id="email" type="email" placeholder="Enter your email" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="Enter your phone number" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="age">Age</Label>
        <Input id="age" type="number" placeholder="Enter your age" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Form example showing different input types with labels.",
      },
    },
  },
};

export const customStyling: Story = {
  args: {
    type: "text",
    placeholder: "Custom styled input",
    className: "border-2 border-blue-300 focus:border-blue-500 bg-blue-50",
  },
  parameters: {
    docs: {
      description: {
        story: "Input with custom styling applied.",
      },
    },
  },
};

export const fileInput: Story = {
  args: {
    type: "file",
  },
  parameters: {
    docs: {
      description: {
        story: "File input for file selection.",
      },
    },
  },
};

export const Invalid: Story = {
  args: {
    type: "email",
    placeholder: "Invalid email",
    value: "invalid-email",
    "aria-invalid": "true",
  },
  parameters: {
    docs: {
      description: {
        story: "Input in invalid state with error styling.",
      },
    },
  },
};
