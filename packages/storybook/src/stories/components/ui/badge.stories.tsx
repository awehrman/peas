import { Badge } from "@peas/components";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "UI/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
      description: "Visual variant of the badge",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
    children: {
      control: "text",
      description: "Badge content",
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: "Badge",
    variant: "default",
  },
  parameters: {
    docs: {
      description: {
        story: "Default badge with primary styling.",
      },
    },
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
  },
  parameters: {
    docs: {
      description: {
        story: "Secondary badge with muted styling.",
      },
    },
  },
};

export const Destructive: Story = {
  args: {
    children: "Destructive",
    variant: "destructive",
  },
  parameters: {
    docs: {
      description: {
        story: "Destructive badge for errors or warnings.",
      },
    },
  },
};

export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
  },
  parameters: {
    docs: {
      description: {
        story: "Outline badge with border styling.",
      },
    },
  },
};

export const statusBadges: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      <Badge variant="default">Active</Badge>
      <Badge variant="secondary">Pending</Badge>
      <Badge variant="destructive">Failed</Badge>
      <Badge variant="outline">Draft</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Common status badges used in applications.",
      },
    },
  },
};

export const countBadges: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      <Badge variant="default">5</Badge>
      <Badge variant="secondary">12</Badge>
      <Badge variant="destructive">3</Badge>
      <Badge variant="outline">0</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Badges used for displaying counts or numbers.",
      },
    },
  },
};

export const categoryBadges: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      <Badge variant="default">React</Badge>
      <Badge variant="secondary">TypeScript</Badge>
      <Badge variant="outline">JavaScript</Badge>
      <Badge variant="default">CSS</Badge>
      <Badge variant="secondary">HTML</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Badges used for categorizing or tagging content.",
      },
    },
  },
};

export const longText: Story = {
  args: {
    children: "Very Long Badge Text",
    variant: "default",
  },
  parameters: {
    docs: {
      description: {
        story: "Badge with longer text to test text wrapping.",
      },
    },
  },
};

export const customStyling: Story = {
  args: {
    children: "Custom",
    variant: "default",
    className:
      "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0",
  },
  parameters: {
    docs: {
      description: {
        story: "Badge with custom gradient styling.",
      },
    },
  },
};

export const withIcons: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      <Badge variant="default" className="flex items-center gap-1">
        <span>✓</span>
        Success
      </Badge>
      <Badge variant="destructive" className="flex items-center gap-1">
        <span>✕</span>
        Error
      </Badge>
      <Badge variant="secondary" className="flex items-center gap-1">
        <span>⏳</span>
        Loading
      </Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Badges with icons for enhanced visual communication.",
      },
    },
  },
};
