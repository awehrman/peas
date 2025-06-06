/**
 * Color palette for the design system
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
  primary: ColorWithForeground;
  secondary: ColorWithForeground;
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
  border: string;
  input: string;
  ring: string;
  background: string;
  foreground: string;
};

/**
 * Default color palette
 */
export const colors: ColorPalette = {
  primary: {
    50: "#e6f1ff",
    100: "#cce3ff",
    200: "#99c7ff",
    300: "#66abff",
    400: "#338fff",
    500: "#2a8af6",
    600: "#0066ff",
    700: "#0052cc",
    800: "#003d99",
    900: "#002966",
    950: "#001433",
    DEFAULT: "#2a8af6",
    foreground: "#ffffff",
  },
  secondary: {
    50: "#e0fcf7",
    100: "#b8f7ec",
    200: "#7eeadf",
    300: "#36dccf",
    400: "#12cfc2",
    500: "#0bb3a7",
    600: "#08998d",
    700: "#067f74",
    800: "#04655a",
    900: "#024b41",
    950: "#01322a",
    DEFAULT: "#0bb3a7",
    foreground: "#ffffff",
  },
  destructive: {
    DEFAULT: "#ef4444",
    foreground: "#ffffff",
  },
  muted: {
    DEFAULT: "#f3f4f6",
    foreground: "#6b7280",
  },
  accent: {
    DEFAULT: "#f59e0b",
    foreground: "#ffffff",
  },
  popover: {
    DEFAULT: "#ffffff",
    foreground: "#111827",
  },
  card: {
    DEFAULT: "#ffffff",
    foreground: "#111827",
  },
  border: "#e5e7eb",
  input: "#e5e7eb",
  ring: "#8b5cf6",
  background: "#ffffff",
  foreground: "#111827",
};

export default colors;
