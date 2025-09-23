import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@peas/components";
import { Button } from "@peas/components";
import { Badge } from "@peas/components";
import type { Meta, StoryObj } from "@storybook/react";
import { Heart, MoreHorizontal, Settings, Share } from "lucide-react";

const meta = {
  title: "UI/Card",
  component: Card,
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
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>
          This is a description of the card content.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the main content of the card.</p>
      </CardContent>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: "Default card with header, content, and description.",
      },
    },
  },
};

export const withFooter: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card with Footer</CardTitle>
        <CardDescription>This card includes a footer section.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Main content goes here.</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">
          Cancel
        </Button>
        <Button size="sm">Save</Button>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: "Card with footer containing action buttons.",
      },
    },
  },
};

export const withAction: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card with Action</CardTitle>
        <CardDescription>
          This card has an action button in the header.
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>Content with header action button.</p>
      </CardContent>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: "Card with an action button in the header area.",
      },
    },
  },
};

export const recipeCard: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Chocolate Chip Cookies</CardTitle>
        <CardDescription>
          Classic homemade chocolate chip cookies
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm">
            <Heart className="h-4 w-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Badge variant="secondary">Dessert</Badge>
            <Badge variant="outline">30 min</Badge>
          </div>
          <p className="text-sm text-gray-600">
            A timeless recipe that never goes out of style. Perfect for any
            occasion.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="flex-1">
          <Share className="h-4 w-4 mr-2" />
          Share
        </Button>
        <Button size="sm" className="flex-1">
          View Recipe
        </Button>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: "Example recipe card showing real-world usage.",
      },
    },
  },
};

export const settingsCard: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Account Settings
        </CardTitle>
        <CardDescription>
          Manage your account preferences and privacy settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email Notifications</label>
          <p className="text-sm text-gray-600">
            Receive updates about your account activity.
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Privacy Level</label>
          <p className="text-sm text-gray-600">
            Control who can see your profile information.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">
          Reset
        </Button>
        <Button size="sm">Save Changes</Button>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: "Settings card with form-like content and actions.",
      },
    },
  },
};

export const Minimal: Story = {
  render: () => (
    <Card>
      <CardContent className="pt-6">
        <p>Minimal card with just content.</p>
      </CardContent>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: "Minimal card with only content, no header or footer.",
      },
    },
  },
};

export const customStyling: Story = {
  render: () => (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
      <CardHeader>
        <CardTitle className="text-blue-900">Custom Styled Card</CardTitle>
        <CardDescription className="text-blue-700">
          This card has custom gradient styling.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-blue-800">Content with custom color scheme.</p>
      </CardContent>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: "Card with custom gradient styling applied.",
      },
    },
  },
};

export const multipleCards: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Card 1</CardTitle>
          <CardDescription>First card in the grid</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for the first card.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Card 2</CardTitle>
          <CardDescription>Second card in the grid</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for the second card.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Card 3</CardTitle>
          <CardDescription>Third card in the grid</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for the third card.</p>
        </CardContent>
      </Card>
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="w-full max-w-4xl">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Multiple cards displayed in a responsive grid layout.",
      },
    },
  },
};
