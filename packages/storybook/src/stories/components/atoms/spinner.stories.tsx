import { Spinner } from "@peas/components";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Atoms/Spinner",
  component: Spinner,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: "Default spinner component with loading animation.",
      },
    },
  },
};

export const inContainer: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div className="h-32 w-32 border border-gray-200 rounded-lg flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Spinner displayed within a container to show its centering behavior.",
      },
    },
  },
};

export const fullScreen: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div className="h-screen w-screen bg-gray-50 flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Spinner displayed full screen for loading states.",
      },
    },
  },
};
