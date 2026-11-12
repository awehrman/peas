import { Navigation, getNavigationItems } from "@peas/features";
import { generateRandomBlobPeaDataUrl } from "@peas/pea-svg-generator";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Navigation/SidebarNavigation",
  component: Navigation,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    navigationItems: getNavigationItems(true),
    pathname: "/notes",
    signOut: async () => {
      console.log("Sign out");
    },
    user: {
      username: "allie",
      avatarUrl: generateRandomBlobPeaDataUrl(),
    },
  },
  decorators: [
    (Story) => (
      <div style={{ display: "flex", height: "100vh" }}>
        <Story />
        <div style={{ flex: 1, padding: 24 }}>Click the ⋮ toggle to expand the sidebar.</div>
      </div>
    ),
  ],
} satisfies Meta<typeof Navigation>;

export default meta;
type Story = StoryObj<typeof Navigation>;

export const ActiveNotes: Story = {};

export const ActiveDashboard: Story = {
  args: { pathname: "/" },
};

export const WithoutAvatarImage: Story = {
  args: { user: { username: "allie", avatarUrl: null } },
};
