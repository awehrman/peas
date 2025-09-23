import { Skeleton } from "@peas/components";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: "Default skeleton with standard size and animation.",
      },
    },
  },
};

export const Circle: Story = {
  args: {
    className: "h-12 w-12 rounded-full",
  },
  parameters: {
    docs: {
      description: {
        story: "Circular skeleton for avatars or profile pictures.",
      },
    },
  },
};

export const Rectangle: Story = {
  args: {
    className: "h-4 w-32",
  },
  parameters: {
    docs: {
      description: {
        story: "Rectangular skeleton for text or buttons.",
      },
    },
  },
};

export const cardSkeleton: Story = {
  render: () => (
    <div className="flex items-center space-x-4 w-80">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Card-like skeleton layout with avatar and text lines.",
      },
    },
  },
};

export const articleSkeleton: Story = {
  render: () => (
    <div className="space-y-3 w-96">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Article skeleton with title and paragraph lines.",
      },
    },
  },
};

export const tableSkeleton: Story = {
  render: () => (
    <div className="space-y-3 w-96">
      <div className="flex space-x-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex space-x-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex space-x-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Table skeleton with multiple rows and columns.",
      },
    },
  },
};

export const formSkeleton: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Form skeleton with labels, inputs, and buttons.",
      },
    },
  },
};

export const customStyling: Story = {
  args: {
    className: "h-4 w-32 bg-blue-200",
  },
  parameters: {
    docs: {
      description: {
        story: "Skeleton with custom blue background color.",
      },
    },
  },
};

export const noAnimation: Story = {
  args: {
    className: "h-4 w-32 animate-none",
  },
  parameters: {
    docs: {
      description: {
        story: "Skeleton without animation for static loading states.",
      },
    },
  },
};

export const differentSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="text-sm text-gray-600">Small</span>
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="space-y-2">
        <span className="text-sm text-gray-600">Medium</span>
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-2">
        <span className="text-sm text-gray-600">Large</span>
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="space-y-2">
        <span className="text-sm text-gray-600">Extra Large</span>
        <Skeleton className="h-8 w-48" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Skeletons of different sizes for various content types.",
      },
    },
  },
};
