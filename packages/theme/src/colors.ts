/**
 * Color system for the design system
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

const primaryColors = {
  50: "oklch(95.0% 0.0900 127.79)",
  100: "oklch(90.0% 0.0900 127.79)",
  200: "oklch(80.0% 0.0900 127.79)",
  300: "oklch(70.0% 0.0900 127.79)",
  400: "oklch(60.0% 0.0900 127.79)",
  500: "oklch(50.0% 0.0900 127.79)",
  600: "oklch(40.0% 0.0900 127.79)",
  700: "oklch(30.0% 0.0900 127.79)",
  800: "oklch(20.0% 0.0900 127.79)",
  900: "oklch(20.0% 0.0900 127.79)",
  950: "oklch(20.0% 0.0900 127.79)",
} as const;

const secondaryColors = {
  50: "oklch(95.0% 0.0300 335.85)",
  100: "oklch(90.0% 0.0300 335.85)",
  200: "oklch(80.0% 0.0300 335.85)",
  300: "oklch(70.0% 0.0300 335.85)",
  400: "oklch(60.0% 0.0300 335.85)",
  500: "oklch(50.0% 0.0300 335.85)",
  600: "oklch(40.0% 0.0300 335.85)",
  700: "oklch(30.0% 0.0300 335.85)",
  800: "oklch(20.0% 0.0300 335.85)",
  900: "oklch(20.0% 0.0300 335.85)",
  950: "oklch(20.0% 0.0300 335.85)",
} as const;

const successColors = {
  50: "oklch(95.0% 0.1788 132.11)",
  100: "oklch(90.0% 0.1788 132.11)",
  200: "oklch(80.0% 0.1788 132.11)",
  300: "oklch(70.0% 0.1788 132.11)",
  400: "oklch(60.0% 0.1788 132.11)",
  500: "oklch(50.0% 0.1788 132.11)",
  600: "oklch(40.0% 0.1788 132.11)",
  700: "oklch(30.0% 0.1788 132.11)",
  800: "oklch(20.0% 0.1788 132.11)",
  900: "oklch(20.0% 0.1788 132.11)",
  950: "oklch(20.0% 0.1788 132.11)",
} as const;

const warningColors = {
  50: "oklch(95.0% 0.1609 93.25)",
  100: "oklch(90.0% 0.1609 93.25)",
  200: "oklch(80.0% 0.1609 93.25)",
  300: "oklch(70.0% 0.1609 93.25)",
  400: "oklch(60.0% 0.1609 93.25)",
  500: "oklch(50.0% 0.1609 93.25)",
  600: "oklch(40.0% 0.1609 93.25)",
  700: "oklch(30.0% 0.1609 93.25)",
  800: "oklch(20.0% 0.1609 93.25)",
  900: "oklch(20.0% 0.1609 93.25)",
  950: "oklch(20.0% 0.1609 93.25)",
} as const;

const errorColors = {
  50: "oklch(95.0% 0.1433 35.05)",
  100: "oklch(90.0% 0.1433 35.05)",
  200: "oklch(80.0% 0.1433 35.05)",
  300: "oklch(70.0% 0.1433 35.05)",
  400: "oklch(60.0% 0.1433 35.05)",
  500: "oklch(50.0% 0.1433 35.05)",
  600: "oklch(40.0% 0.1433 35.05)",
  700: "oklch(30.0% 0.1433 35.05)",
  800: "oklch(20.0% 0.1433 35.05)",
  900: "oklch(20.0% 0.1433 35.05)",
  950: "oklch(20.0% 0.1433 35.05)",
} as const;

const infoColors = {
  50: "oklch(95.0% 0.1153 192.59)",
  100: "oklch(90.0% 0.1153 192.59)",
  200: "oklch(80.0% 0.1153 192.59)",
  300: "oklch(70.0% 0.1153 192.59)",
  400: "oklch(60.0% 0.1153 192.59)",
  500: "oklch(50.0% 0.1153 192.59)",
  600: "oklch(40.0% 0.1153 192.59)",
  700: "oklch(30.0% 0.1153 192.59)",
  800: "oklch(20.0% 0.1153 192.59)",
  900: "oklch(20.0% 0.1153 192.59)",
  950: "oklch(20.0% 0.1153 192.59)",
} as const;

const greyscaleColors = {
  50: "oklch(90.7% 0.013 150.5)",
  100: "oklch(80.7% 0.017 150.5)",
  200: "oklch(70.7% 0.015 150.5)",
  300: "oklch(60.7% 0.013 150.5)",
  400: "oklch(50.7% 0.011 150.5)",
  500: "oklch(40.7% 0.009 150.5)",
  600: "oklch(30.7% 0.007 150.5)",
  700: "oklch(20.7% 0.004 150.5)",
  800: "oklch(10.7% 0.002 150.5)",
  900: "oklch(10.7% 0.002 150.5)",
  950: "oklch(10.7% 0.002 150.5)",
} as const;

const neutralColors = {
  50: "oklch(100.0% 0.0382 96.53)",
  100: "oklch(95.0% 0.0382 96.53)",
  200: "oklch(90.0% 0.0382 96.53)",
  300: "oklch(80.0% 0.0382 96.53)",
  400: "oklch(70.0% 0.0382 96.53)",
  500: "oklch(60.0% 0.0382 96.53)",
  600: "oklch(50.0% 0.0382 96.53)",
  700: "oklch(40.0% 0.0382 96.53)",
  800: "oklch(30.0% 0.0382 96.53)",
  900: "oklch(20.0% 0.0382 96.53)",
  950: "oklch(20.0% 0.0382 96.53)",
} as const;

/**
 * Default color palette
 */
export const colors: ColorPalette = {
  white,
  black,
  primary: {
    ...primaryColors,
    DEFAULT: primaryColors[500], // Used for backgrounds, borders, fills
    foreground: white, // Text color on primary backgrounds
  },
  secondary: {
    ...secondaryColors,
    DEFAULT: secondaryColors[500], // Used for backgrounds, borders, fills
    foreground: white, // Text color on secondary backgrounds
  },
  success: {
    ...successColors,
    DEFAULT: successColors[500], // Used for backgrounds, borders, fills
    foreground: white, // Text color on success backgrounds
  },
  warning: {
    ...warningColors,
    DEFAULT: warningColors[500], // Used for backgrounds, borders, fills
    foreground: white, // Text color on warning backgrounds
  },
  error: {
    ...errorColors,
    DEFAULT: errorColors[500], // Used for backgrounds, borders, fills
    foreground: white, // Text color on error backgrounds
  },
  info: {
    ...infoColors,
    DEFAULT: infoColors[500], // Used for backgrounds, borders, fills
    foreground: white, // Text color on info backgrounds
  },
  greyscale: greyscaleColors,
  neutrals: neutralColors,
  destructive: {
    DEFAULT: errorColors[500], // Used for destructive action backgrounds
    foreground: white, // Text color on destructive backgrounds
  },
  muted: {
    DEFAULT: neutralColors[100], // Used for disabled/secondary backgrounds (95% lightness)
    foreground: neutralColors[800], // Text color on muted backgrounds
  },
  accent: {
    DEFAULT: neutralColors[300], // Used for accent/highlight backgrounds (80% lightness)
    foreground: neutralColors[800], // Text color on accent backgrounds
  },
  popover: {
    DEFAULT: white, // Used for dropdown/popover backgrounds (same as background)
    foreground: greyscaleColors[900], // Text color on popover backgrounds
  },
  card: {
    DEFAULT: white, // Used for card/panel backgrounds (same as background)
    foreground: greyscaleColors[900], // Text color on card backgrounds
  },
  navigation: {
    DEFAULT: white, // Used for navigation/sidebar backgrounds
    foreground: greyscaleColors[900], // Text color on navigation backgrounds
  },
  header: {
    DEFAULT: white, // Used for header/topbar backgrounds
    foreground: greyscaleColors[900], // Text color on header backgrounds
  },
  border: greyscaleColors[200], // Used for borders, dividers, outlines
  input: neutralColors[300], // Used for input field backgrounds (80% lightness)
  ring: primaryColors[500], // Used for focus rings/outlines (same as primary)
  background: white, // Used for main page/app background
  foreground: greyscaleColors[900], // Used for default text color
};

export default colors;
