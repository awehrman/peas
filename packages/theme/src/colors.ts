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
    DEFAULT: "oklch(50.0% 0.0900 127.79)",
    foreground: "oklch(95.0% 0.0382 96.53)",
  },
  secondary: {
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
    DEFAULT: "oklch(50.0% 0.0300 335.85)",
    foreground: "oklch(95.0% 0.0382 96.53)",
  },
  destructive: {
    DEFAULT: "oklch(50.0% 0.1433 35.05)",
    foreground: "oklch(95.0% 0.0382 96.53)",
  },
  muted: {
    DEFAULT: "oklch(90.0% 0.0382 96.53)",
    foreground: "oklch(30.0% 0.0382 96.53)",
  },
  accent: {
    DEFAULT: "oklch(50.0% 0.1609 93.25)",
    foreground: "oklch(95.0% 0.0382 96.53)",
  },
  popover: {
    DEFAULT: "oklch(100.0% 0.0382 96.53)",
    foreground: "oklch(20.0% 0.0382 96.53)",
  },
  card: {
    DEFAULT: "oklch(100.0% 0.0382 96.53)",
    foreground: "oklch(20.0% 0.0382 96.53)",
  },
  border: "oklch(80.0% 0.0382 96.53)",
  input: "oklch(80.0% 0.0382 96.53)",
  ring: "oklch(50.0% 0.1153 192.59)",
  background: "oklch(100.0% 0.0382 96.53)",
  foreground: "oklch(20.0% 0.0382 96.53)",
};

export default colors;
