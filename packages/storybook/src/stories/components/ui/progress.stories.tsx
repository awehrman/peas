import { Progress } from "@peas/components";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "UI/Progress",
  component: Progress,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: { type: "range", min: 0, max: 100, step: 1 },
      description: "Progress value (0-100)",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  args: {
    value: 50,
  },
  parameters: {
    docs: {
      description: {
        story: "Default progress bar at 50% completion.",
      },
    },
  },
};

export const Empty: Story = {
  args: {
    value: 0,
  },
  parameters: {
    docs: {
      description: {
        story: "Empty progress bar at 0% completion.",
      },
    },
  },
};

export const Complete: Story = {
  args: {
    value: 100,
  },
  parameters: {
    docs: {
      description: {
        story: "Complete progress bar at 100% completion.",
      },
    },
  },
};

export const Quarter: Story = {
  args: {
    value: 25,
  },
  parameters: {
    docs: {
      description: {
        story: "Progress bar at 25% completion.",
      },
    },
  },
};

export const ThreeQuarters: Story = {
  args: {
    value: 75,
  },
  parameters: {
    docs: {
      description: {
        story: "Progress bar at 75% completion.",
      },
    },
  },
};

export const withLabel: Story = {
  render: () => (
    <div className="space-y-2 w-64">
      <div className="flex justify-between text-sm">
        <span>Upload Progress</span>
        <span>65%</span>
      </div>
      <Progress value={65} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Progress bar with label and percentage display.",
      },
    },
  },
};

export const multipleProgress: Story = {
  render: () => (
    <div className="space-y-4 w-64">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Download</span>
          <span>30%</span>
        </div>
        <Progress value={30} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Installation</span>
          <span>80%</span>
        </div>
        <Progress value={80} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Verification</span>
          <span>100%</span>
        </div>
        <Progress value={100} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Multiple progress bars showing different stages of a process.",
      },
    },
  },
};

export const customStyling: Story = {
  args: {
    value: 60,
    className: "h-4 bg-green-100",
  },
  render: (args) => (
    <div className="space-y-2 w-64">
      <div className="flex justify-between text-sm">
        <span>Custom Styled</span>
        <span>60%</span>
      </div>
      <Progress {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Progress bar with custom styling applied.",
      },
    },
  },
};

export const largeSize: Story = {
  args: {
    value: 45,
    className: "h-6",
  },
  render: (args) => (
    <div className="space-y-2 w-64">
      <div className="flex justify-between text-sm">
        <span>Large Progress</span>
        <span>45%</span>
      </div>
      <Progress {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Large progress bar with increased height.",
      },
    },
  },
};

export const smallSize: Story = {
  args: {
    value: 70,
    className: "h-1",
  },
  render: (args) => (
    <div className="space-y-2 w-64">
      <div className="flex justify-between text-sm">
        <span>Small Progress</span>
        <span>70%</span>
      </div>
      <Progress {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Small progress bar with minimal height.",
      },
    },
  },
};
