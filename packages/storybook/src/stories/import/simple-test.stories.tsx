import { ImportFileUpload } from "@peas/features";
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Import/Test",
  component: ImportFileUpload,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ImportFileUpload>;

export default meta;
type Story = StoryObj<typeof ImportFileUpload>;

export const Simple: Story = {
  args: {
    disabled: false,
  },
};
