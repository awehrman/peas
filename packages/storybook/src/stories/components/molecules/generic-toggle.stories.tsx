import { useState } from "react";

import { GenericToggle } from "@peas/components";
import { action } from "@storybook/addon-actions";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Eye,
  EyeOff,
  Heart,
  HeartOff,
  Moon,
  Sun,
  Volume2,
  VolumeX,
} from "lucide-react";

const meta = {
  title: "Molecules/GenericToggle",
  component: GenericToggle,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    isOn: {
      control: "boolean",
      description: "Whether the toggle is currently on",
    },
    onToggle: { action: "toggled" },
    onIcon: {
      control: false,
      description: "Icon to show when toggle is on",
    },
    offIcon: {
      control: false,
      description: "Icon to show when toggle is off",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
    ariaLabel: {
      control: "text",
      description: "Accessibility label for the toggle",
    },
    size: {
      control: "select",
      options: ["sm", "default", "lg"],
      description: "Size of the toggle",
    },
    variant: {
      control: "select",
      options: ["default", "outline"],
      description: "Visual variant of the toggle",
    },
  },
} satisfies Meta<typeof GenericToggle>;

export default meta;
type Story = StoryObj<typeof GenericToggle>;

// Interactive wrapper for stories that need state
const InteractiveWrapper = ({
  children,
  initialValue = false,
}: {
  children: (isOn: boolean, onToggle: () => void) => React.ReactNode;
  initialValue?: boolean;
}) => {
  const [isOn, setIsOn] = useState(initialValue);
  const onToggle = () => {
    setIsOn(!isOn);
    action("toggled")(!isOn);
  };

  return <>{children(isOn, onToggle)}</>;
};

export const Default: Story = {
  args: {
    isOn: false,
    onToggle: action("toggled"),
    onIcon: Eye,
    offIcon: EyeOff,
    ariaLabel: "Toggle visibility",
    size: "default",
    variant: "default",
  },
  parameters: {
    docs: {
      description: {
        story: "Default toggle with eye icons for visibility control.",
      },
    },
  },
};

export const Interactive: Story = {
  render: () => (
    <InteractiveWrapper>
      {(isOn, onToggle) => (
        <GenericToggle
          isOn={isOn}
          onToggle={onToggle}
          onIcon={Eye}
          offIcon={EyeOff}
          ariaLabel="Toggle visibility"
        />
      )}
    </InteractiveWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story: "Interactive toggle that maintains its own state.",
      },
    },
  },
};

export const themeToggle: Story = {
  render: () => (
    <InteractiveWrapper>
      {(isOn, onToggle) => (
        <GenericToggle
          isOn={isOn}
          onToggle={onToggle}
          onIcon={Sun}
          offIcon={Moon}
          ariaLabel="Toggle theme"
          variant="outline"
        />
      )}
    </InteractiveWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story: "Theme toggle with sun/moon icons and outline variant.",
      },
    },
  },
};

export const volumeToggle: Story = {
  render: () => (
    <InteractiveWrapper>
      {(isOn, onToggle) => (
        <GenericToggle
          isOn={isOn}
          onToggle={onToggle}
          onIcon={Volume2}
          offIcon={VolumeX}
          ariaLabel="Toggle volume"
          size="lg"
        />
      )}
    </InteractiveWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story: "Volume toggle with large size and volume icons.",
      },
    },
  },
};

export const favoriteToggle: Story = {
  render: () => (
    <InteractiveWrapper initialValue={true}>
      {(isOn, onToggle) => (
        <GenericToggle
          isOn={isOn}
          onToggle={onToggle}
          onIcon={Heart}
          offIcon={HeartOff}
          ariaLabel="Toggle favorite"
          variant="outline"
          className="text-red-500 hover:text-red-600 data-[state=on]:text-red-500 data-[state=on]:bg-red-50"
        />
      )}
    </InteractiveWrapper>
  ),
  parameters: {
    docs: {
      description: {
        story: "Favorite toggle with heart icons and custom red styling.",
      },
    },
  },
};

export const smallSize: Story = {
  args: {
    isOn: false,
    onToggle: action("toggled"),
    onIcon: Eye,
    offIcon: EyeOff,
    ariaLabel: "Small toggle",
    size: "sm",
    variant: "default",
  },
  parameters: {
    docs: {
      description: {
        story: "Small sized toggle.",
      },
    },
  },
};

export const largeSize: Story = {
  args: {
    isOn: false,
    onToggle: action("toggled"),
    onIcon: Eye,
    offIcon: EyeOff,
    ariaLabel: "Large toggle",
    size: "lg",
    variant: "default",
  },
  parameters: {
    docs: {
      description: {
        story: "Large sized toggle.",
      },
    },
  },
};

export const outlineVariant: Story = {
  args: {
    isOn: false,
    onToggle: action("toggled"),
    onIcon: Eye,
    offIcon: EyeOff,
    ariaLabel: "Outline toggle",
    size: "default",
    variant: "outline",
  },
  parameters: {
    docs: {
      description: {
        story: "Toggle with outline variant.",
      },
    },
  },
};

export const multipleToggles: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      <InteractiveWrapper>
        {(isOn, onToggle) => (
          <GenericToggle
            isOn={isOn}
            onToggle={onToggle}
            onIcon={Eye}
            offIcon={EyeOff}
            ariaLabel="Toggle visibility"
          />
        )}
      </InteractiveWrapper>

      <InteractiveWrapper>
        {(isOn, onToggle) => (
          <GenericToggle
            isOn={isOn}
            onToggle={onToggle}
            onIcon={Volume2}
            offIcon={VolumeX}
            ariaLabel="Toggle volume"
            variant="outline"
          />
        )}
      </InteractiveWrapper>

      <InteractiveWrapper initialValue={true}>
        {(isOn, onToggle) => (
          <GenericToggle
            isOn={isOn}
            onToggle={onToggle}
            onIcon={Heart}
            offIcon={HeartOff}
            ariaLabel="Toggle favorite"
            className="text-red-500 hover:text-red-600 data-[state=on]:text-red-500 data-[state=on]:bg-red-50"
          />
        )}
      </InteractiveWrapper>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Multiple toggles displayed together to show different states and variants.",
      },
    },
  },
};
