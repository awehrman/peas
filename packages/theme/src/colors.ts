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
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
    950: "#052e16",
    DEFAULT: "#22c55e",
    foreground: "#ffffff",
  },
  secondary: {
    50: "#f5f3ff",
    100: "#ede9fe",
    200: "#ddd6fe",
    300: "#c4b5fd",
    400: "#a78bfa",
    500: "#8b5cf6",
    600: "#7c3aed",
    700: "#6d28d9",
    800: "#5b21b6",
    900: "#4c1d95",
    950: "#2e1065",
    DEFAULT: "#8b5cf6",
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
