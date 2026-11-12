/**
 * Color system for the design system
 *
 * Hues come from the original recipes app: teal for actions, soft blue for
 * highlights and focus, a navy sidebar and neutral cool greys.
 */

export type ColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
};

export type ColorWithForeground = ColorScale & {
  DEFAULT: string;
  foreground: string;
};

export type ColorPalette = {
  white: string;
  black: string;
  primary: ColorWithForeground;
  secondary: ColorWithForeground;
  success: ColorWithForeground;
  warning: ColorWithForeground;
  error: ColorWithForeground;
  info: ColorWithForeground;
  greyscale: ColorScale;
  neutrals: ColorScale;
  destructive: {
    DEFAULT: string;
    foreground: string;
  };
  muted: {
    DEFAULT: string;
    foreground: string;
  };
  accent: {
    DEFAULT: string;
    foreground: string;
  };
  popover: {
    DEFAULT: string;
    foreground: string;
  };
  card: {
    DEFAULT: string;
    foreground: string;
  };
  navigation: {
    DEFAULT: string;
    foreground: string;
  };
  header: {
    DEFAULT: string;
    foreground: string;
  };
  border: string;
  input: string;
  ring: string;
  background: string;
  foreground: string;
};

/**
 * Base color definitions
 */
const white = "#ffffff";
const black = "#000000";

/**
 * OKLCH lightness scale for consistent color progression
 * Maps to Tailwind color scale: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
 */
const oklchScale = {
  50: 98.0, // Lightest
  100: 95.0,
  200: 90.0,
  300: 80.0,
  400: 70.0,
  500: 60.0, // Base/middle
  600: 50.0,
  700: 40.0,
  800: 30.0,
  900: 20.0,
  950: 10.0, // Darkest
} as const;

/** Very light and very dark steps can't hold full chroma, so it tapers off. */
const chromaTaper = {
  50: 0.15,
  100: 0.3,
  200: 0.55,
  300: 0.85,
  400: 1,
  500: 1,
  600: 1,
  700: 0.9,
  800: 0.75,
  900: 0.6,
  950: 0.45,
} as const;

function createScale(chroma: number, hue: number): ColorScale {
  const steps = Object.keys(oklchScale) as unknown as (keyof typeof oklchScale)[];
  return Object.fromEntries(
    steps.map((step) => [
      step,
      `oklch(${oklchScale[step]}% ${(chroma * chromaTaper[step]).toFixed(4)} ${hue})`,
    ])
  ) as ColorScale;
}

// recipes altGreen #73C6B6 ≈ oklch(76.9% 0.085 180.13)
const primaryColors = createScale(0.085, 180.13);

// recipes highlight #80AEF5 ≈ oklch(74.6% 0.1146 258.84)
const secondaryColors = createScale(0.1146, 258.84);

// recipes green rgba(120, 224, 143) ≈ oklch(82.4% 0.1497 149.34)
const successColors = createScale(0.1497, 149.34);

// recipes orange rgba(255, 159, 67) ≈ oklch(78.5% 0.154 60.69)
const warningColors = createScale(0.154, 60.69);

// recipes red rgba(255, 99, 72) ≈ oklch(69.6% 0.1953 32.05)
const errorColors = createScale(0.1953, 32.05);

const infoColors = createScale(0.1146, 258.84);

// recipes lighterGrey #909497 ≈ oklch(66.4% 0.0064 239.87)
const greyscaleColors = createScale(0.0064, 239.87);

const neutralColors = createScale(0.004, 239.87);

// recipes menuBackground / menuColor
const navy = "oklch(35.9% 0.0558 259.66)";
const menuColor = "oklch(87.8% 0.0502 265.38)";

// recipes headerBackground #f8f8f8 and bodyText #222
const headerBackground = "oklch(97.9% 0 0)";
const bodyText = "oklch(25.2% 0 0)";

/**
 * Default color palette
 */
export const colors: ColorPalette = {
  white,
  black,
  primary: {
    ...primaryColors,
    DEFAULT: primaryColors[600], // Darker than recipes' teal so white text stays readable
    foreground: white, // Text color on primary backgrounds
  },
  secondary: {
    ...secondaryColors,
    DEFAULT: secondaryColors[100], // Soft blue fill for secondary buttons and badges
    foreground: secondaryColors[800], // Text color on secondary backgrounds
  },
  success: {
    ...successColors,
    DEFAULT: successColors[600], // Used for backgrounds, borders, fills
    foreground: white, // Text color on success backgrounds
  },
  warning: {
    ...warningColors,
    DEFAULT: warningColors[500], // Used for backgrounds, borders, fills
    foreground: bodyText, // Text color on warning backgrounds
  },
  error: {
    ...errorColors,
    DEFAULT: errorColors[600], // Used for backgrounds, borders, fills
    foreground: white, // Text color on error backgrounds
  },
  info: {
    ...infoColors,
    DEFAULT: infoColors[600], // Used for backgrounds, borders, fills
    foreground: white, // Text color on info backgrounds
  },
  greyscale: greyscaleColors,
  neutrals: neutralColors,
  destructive: {
    DEFAULT: errorColors[600], // Used for destructive action backgrounds
    foreground: white, // Text color on destructive backgrounds
  },
  muted: {
    DEFAULT: greyscaleColors[100], // Used for disabled/secondary backgrounds
    foreground: greyscaleColors[600], // Text color on muted backgrounds
  },
  accent: {
    DEFAULT: secondaryColors[50], // Hover/highlight backgrounds (recipes lightBlue)
    foreground: bodyText, // Text color on accent backgrounds
  },
  popover: {
    DEFAULT: white, // Used for dropdown/popover backgrounds
    foreground: bodyText, // Text color on popover backgrounds
  },
  card: {
    DEFAULT: white, // Used for card/panel backgrounds
    foreground: bodyText, // Text color on card backgrounds
  },
  navigation: {
    DEFAULT: navy, // Used for navigation/sidebar backgrounds
    foreground: menuColor, // Text color on navigation backgrounds
  },
  header: {
    DEFAULT: headerBackground, // Used for header/topbar backgrounds
    foreground: greyscaleColors[600], // Text color on header backgrounds
  },
  border: greyscaleColors[200], // Used for borders, dividers, outlines
  input: greyscaleColors[300], // Input borders; fields stay white
  ring: secondaryColors[400], // Focus rings (recipes highlight blue)
  background: white, // Used for main page/app background
  foreground: bodyText, // Used for default text color
};

export default colors;
