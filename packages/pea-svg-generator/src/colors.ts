import type { PeaColor } from "./types.js";
import {
  darkenHexColor,
  isLightColor,
  lightenHexColor,
} from "./utils/color-utils.js";

/** User-selected palette, preserved exactly from the five reference swatches.
 * Stroke and dot colors are derived from each base to keep the subtle contour style cohesive.
 */
const swatches = [
  { name: "Soft Lemon", base: "#f5f5b8", group: "accent" },
  { name: "Pinkish Cinnamon", base: "#f2ad78", group: "accent" },
  { name: "Olive Green", base: "#718600", group: "green" },
  { name: "Near Black Forest", base: "#172713", group: "green" },
  { name: "Cranberry", base: "#a10b2b", group: "accent" },
  { name: "Orange Yellow", base: "#ffab00", group: "accent" },
  { name: "Deep Forest", base: "#00592e", group: "green" },
  { name: "Dusty Lavender", base: "#bfabcc", group: "accent" },
  { name: "Plum", base: "#5c2c45", group: "accent" },
  { name: "Pale Yellow", base: "#fff59e", group: "accent" },
  { name: "Lincoln Green", base: "#405416", group: "green" },
  { name: "Walnut Brown", base: "#5e4017", group: "accent" },
  { name: "Leaf Green", base: "#85b857", group: "green" },
  { name: "Ivory Buff", base: "#ebd999", group: "accent" },
  { name: "Brick Red", base: "#a32100", group: "accent" },
  { name: "Brown", base: "#6c2b11", group: "accent" },
  { name: "Vandyke Brown", base: "#362304", group: "green" },
  { name: "Ochraceous Salmon", base: "#d99e73", group: "accent" },
  { name: "Vinaceous Cinnamon", base: "#f59994", group: "accent" },
 ] as const;

// Pale bases get darker spots and outlines; lightening them would vanish into white.
export const PEA_COLORS: PeaColor[] = swatches.map(({ name, base }) => ({
  name,
  base,
  stroke: darkenHexColor(base, isLightColor(base) ? 0.32 : 0.2),
  highlight: isLightColor(base)
    ? darkenHexColor(base, 0.2)
    : lightenHexColor(base, 0.33),
}));

export const GREEN_COLOR_NAMES = new Set<string>(
  swatches.filter(({ group }) => group === "green").map(({ name }) => name),
);

// Keep these combinations compatible with the original standalone generator.
export const MIXED_COLOR_COMBINATIONS = [
  { base: "Olive Green", highlight: "Leaf Green" },
  { base: "Deep Forest", highlight: "Mint Green" },
  { base: "Lincoln Green", highlight: "Spring Green" },
  { base: "Leaf Green", highlight: "Olive Green" },
  { base: "Spring Green", highlight: "Soft Lemon" },
  { base: "Near Black Forest", highlight: "Leaf Green" },
];

export const HIGHLIGHT_POSITIONS = [
  { x: -10, y: -10, rx: 8, ry: 6, opacity: 0.7 },
  { x: 10, y: -5, rx: 5, ry: 4, opacity: 0.5 },
  { x: 0, y: 0, rx: 4, ry: 3, opacity: 0.6 },
];
