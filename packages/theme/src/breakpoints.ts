/**
 * Breakpoints system for the design system
 */

export type Breakpoints = {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
};

/**
 * Default breakpoint values
 */
export const breakpoints: Breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};

export default breakpoints;
