/**
 * Typography system for the design system
 */

export type FontFamily = {
  sans: string[];
  mono: string[];
};

export type FontSize = {
  xs: string;
  sm: string;
  base: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
  "4xl": string;
  "5xl": string;
  "6xl": string;
  "7xl": string;
  "8xl": string;
  "9xl": string;
};

export type FontWeight = {
  thin: string;
  extralight: string;
  light: string;
  normal: string;
  medium: string;
  semibold: string;
  bold: string;
  extrabold: string;
  black: string;
};

export type Tracking = {
  tight: string;
  normal: string;
  wide: string;
};

export type Typography = {
  fontFamily: FontFamily;
  fontSize: FontSize;
  /** Line height paired with each font size */
  lineHeight: FontSize;
  fontWeight: FontWeight;
  tracking: Tracking;
};

/**
 * Default typography settings
 *
 * Source Sans 3 has a small x-height, so line heights run a touch tighter
 * than Tailwind's defaults to keep text blocks from looking airy.
 */
export const typography: Typography = {
  fontFamily: {
    sans: [
      "var(--font-source-sans)",
      "system-ui",
      "-apple-system",
      "Segoe UI",
      "sans-serif",
    ],
    mono: [
      "ui-monospace",
      "SFMono-Regular",
      "Menlo",
      "Consolas",
      "monospace",
    ],
  },
  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
    "5xl": "3rem", // 48px
    "6xl": "3.75rem", // 60px
    "7xl": "4.5rem", // 72px
    "8xl": "6rem", // 96px
    "9xl": "8rem", // 128px
  },
  lineHeight: {
    xs: "1rem",
    sm: "1.25rem",
    base: "1.5rem",
    lg: "1.625rem",
    xl: "1.75rem",
    "2xl": "2rem",
    "3xl": "2.25rem",
    "4xl": "2.5rem",
    "5xl": "1.1",
    "6xl": "1.05",
    "7xl": "1",
    "8xl": "1",
    "9xl": "1",
  },
  fontWeight: {
    thin: "100",
    extralight: "200",
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  },
  tracking: {
    tight: "-0.015em",
    normal: "0em",
    wide: "0.025em",
  },
};

export default typography;
