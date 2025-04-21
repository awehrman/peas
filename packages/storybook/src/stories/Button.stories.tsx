import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@peas/ui";
import { cn } from "@peas/ui";

const meta = {
  title: "Atoms/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outline", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    asChild: {
      control: "boolean",
    },
    onClick: { action: "clicked" },
    className: {
      control: "text",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof Button>;

// Helper function to generate button classes based on variant and size
const getButtonClasses = (variant: string, size: string) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";

  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "underline-offset-4 hover:underline text-primary",
  };

  const sizeClasses = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3 rounded-md",
    lg: "h-11 px-8 rounded-md",
    icon: "h-10 w-10",
  };

  return cn(
    baseClasses,
    variantClasses[variant as keyof typeof variantClasses],
    sizeClasses[size as keyof typeof sizeClasses]
  );
};

export const Default: Story = {
  args: {
    children: "Button",
    variant: "default",
    size: "default",
    className: getButtonClasses("default", "default"),
  },
};

export const Outline: Story = {
  args: {
    children: "Button",
    variant: "outline",
    size: "default",
    className: getButtonClasses("outline", "default"),
  },
};

export const Ghost: Story = {
  args: {
    children: "Button",
    variant: "ghost",
    size: "default",
    className: getButtonClasses("ghost", "default"),
  },
};

export const Link: Story = {
  args: {
    children: "Button",
    variant: "link",
    size: "default",
    className: getButtonClasses("link", "default"),
  },
};

export const Small: Story = {
  args: {
    children: "Small Button",
    size: "sm",
    className: getButtonClasses("default", "sm"),
  },
};

export const Large: Story = {
  args: {
    children: "Large Button",
    size: "lg",
    className: getButtonClasses("default", "lg"),
  },
};

export const Icon: Story = {
  args: {
    children: "🔍",
    size: "icon",
    className: getButtonClasses("default", "icon"),
  },
};

export const WithCustomClass: Story = {
  args: {
    children: "Custom Style",
    className:
      "bg-purple-500 hover:bg-purple-600 text-white rounded-full px-6 py-2",
  },
};
