import type { PeaColor } from "./types.js";

export const PEA_COLORS: PeaColor[] = [
  {
    name: "Classic Green",
    base: "#4CAF50",
    stroke: "#388E3C",
    highlight: "#66BB6A"
  },
  {
    name: "Bright Green",
    base: "#9abf44",
    stroke: "#7a9f35",
    highlight: "#b8d45a"
  },
  {
    name: "Dark Green",
    base: "#23400d",
    stroke: "#1a300a",
    highlight: "#2d5210"
  },
  {
    name: "Light Green",
    base: "#cde87d",
    stroke: "#a3c864",
    highlight: "#d8ed8a"
  },
  {
    name: "Forest Green",
    base: "#4c7017",
    stroke: "#3d5a12",
    highlight: "#5d8a1d"
  },
  {
    name: "Lime Green",
    base: "#a8d048",
    stroke: "#86a639",
    highlight: "#b8da5a"
  },
  {
    name: "Yellow",
    base: "#FFC107",
    stroke: "#FF8F00",
    highlight: "#FFD54F"
  },
  {
    name: "Purple",
    base: "#9C27B0",
    stroke: "#7B1FA2",
    highlight: "#BA68C8"
  },
  {
    name: "Sugar Snap",
    base: "#8BC34A",
    stroke: "#689F38",
    highlight: "#A5D6A7"
  },
  {
    name: "Split Pea",
    base: "#795548",
    stroke: "#5D4037",
    highlight: "#A1887F"
  }
];

export const HIGHLIGHT_POSITIONS = [
  // Top left
  { x: -5, y: -5, rx: 8, ry: 6, opacity: 0.7 },
  { x: 10, y: 5, rx: 5, ry: 4, opacity: 0.5 },
  
  // Top right
  { x: 10, y: -10, rx: 8, ry: 6, opacity: 0.7 },
  { x: -5, y: 10, rx: 5, ry: 4, opacity: 0.5 },
  
  // Bottom left
  { x: -10, y: 10, rx: 8, ry: 6, opacity: 0.7 },
  { x: 15, y: -10, rx: 5, ry: 4, opacity: 0.5 },
  
  // Bottom right
  { x: 15, y: 10, rx: 8, ry: 6, opacity: 0.7 },
  { x: -10, y: -10, rx: 5, ry: 4, opacity: 0.5 },
  
  // Center
  { x: 0, y: 0, rx: 10, ry: 8, opacity: 0.7 },
  { x: -10, y: -10, rx: 4, ry: 3, opacity: 0.5 },
  
  // Multiple small
  { x: -10, y: -10, rx: 6, ry: 4, opacity: 0.7 },
  { x: 15, y: 10, rx: 4, ry: 3, opacity: 0.5 },
  { x: 0, y: -5, rx: 3, ry: 2, opacity: 0.6 },
  
  // Diagonal
  { x: -10, y: -5, rx: 7, ry: 5, opacity: 0.7 },
  { x: 15, y: 5, rx: 5, ry: 3, opacity: 0.5 },
  
  // Upper
  { x: -10, y: -15, rx: 8, ry: 6, opacity: 0.7 },
  { x: 10, y: -5, rx: 5, ry: 4, opacity: 0.5 },
  
  // Lower
  { x: 10, y: 15, rx: 8, ry: 6, opacity: 0.7 },
  { x: -10, y: 5, rx: 5, ry: 4, opacity: 0.5 },
  
  // Side
  { x: -15, y: 0, rx: 8, ry: 6, opacity: 0.7 },
  { x: 15, y: 0, rx: 5, ry: 4, opacity: 0.5 }
];

export const MIXED_COLOR_COMBINATIONS = [
  { base: "Bright Green", highlight: "Lime Green" },
  { base: "Dark Green", highlight: "Light Green" },
  { base: "Forest Green", highlight: "Bright Green" },
  { base: "Lime Green", highlight: "Forest Green" },
  { base: "Classic Green", highlight: "Bright Green" },
  { base: "Light Green", highlight: "Dark Green" }
]; 