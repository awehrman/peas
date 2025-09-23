import { Header } from "@peas/components";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Molecules/Header",
  component: Header,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    routeName: {
      control: "text",
      description: "The name of the current route/page",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof Header>;

export const Default: Story = {
  args: {
    routeName: "Dashboard",
    className: "",
  },
  parameters: {
    docs: {
      description: {
        story: "Default header with route name.",
      },
    },
  },
};

export const importPage: Story = {
  args: {
    routeName: "Import",
    className: "",
  },
  parameters: {
    docs: {
      description: {
        story: "Header for the Import page.",
      },
    },
  },
};

export const recipesPage: Story = {
  args: {
    routeName: "Recipes",
    className: "",
  },
  parameters: {
    docs: {
      description: {
        story: "Header for the Recipes page.",
      },
    },
  },
};

export const ingredientsPage: Story = {
  args: {
    routeName: "Ingredients",
    className: "",
  },
  parameters: {
    docs: {
      description: {
        story: "Header for the Ingredients page.",
      },
    },
  },
};

export const longRouteName: Story = {
  args: {
    routeName: "Very Long Route Name That Might Wrap",
    className: "",
  },
  parameters: {
    docs: {
      description: {
        story: "Header with a long route name to test text wrapping.",
      },
    },
  },
};

export const withCustomStyling: Story = {
  args: {
    routeName: "Custom Styled",
    className: "bg-gradient-to-r from-blue-500 to-purple-600 text-white",
  },
  parameters: {
    docs: {
      description: {
        story: "Header with custom styling applied.",
      },
    },
  },
};

export const mobileView: Story = {
  args: {
    routeName: "Mobile View",
    className: "",
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Header displayed in mobile viewport width.",
      },
    },
  },
};
