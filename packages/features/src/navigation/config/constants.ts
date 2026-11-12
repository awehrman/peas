import { breakpoints } from "@peas/theme";

// Navigation component constants
export const NAVIGATION_CONSTANTS = {
  // Positioning
  DEFAULT_MOUSE_Y: 60,
  MOUSE_BOUNDARY: 20,
  // Half the toggle's height (h-6), so its center lands on the cursor
  TOGGLE_HALF_HEIGHT: 12,
  MOBILE_TOGGLE_RIGHT: 28,

  // Sidebar list geometry; keep in sync with TOP_PADDING and the row classes
  NAV_LIST_TOP: 20, // pt-5, so the first row lines up with the page header title
  NAV_ROW_HEIGHT: 32, // py-1.5 + text-sm line height
  // Expanded sidebar avatar and username above the list; keep in sync with
  // AVATAR_SIZE, AVATAR_MARGIN, and the gap-2 / text-sm username row
  AVATAR_BLOCK_HEIGHT: 124, // h-16 + gap-2 + 20px username line + mb-8
  AVATAR_SIZE: "h-16 w-16",
  AVATAR_MARGIN: "mb-8",

  // Timing
  AUTO_RESET_DELAY: 2000,
  ANIMATION_DURATION: 2000,

  // Sizing
  EXPANDED_WIDTH: "w-48", // 192px
  COLLAPSED_WIDTH: "w-11", // 44px
  TOGGLE_SIZE: "sm",

  // Mobile Sizing
  MOBILE_EXPANDED_HEIGHT: "h-80", // 320px - increased for better content spacing
  MOBILE_COLLAPSED_HEIGHT: "h-12", // 48px - reduced for more compact collapsed state

  // Layout
  // No horizontal padding so row highlights run edge to edge
  SIDEBAR_PADDING: "pb-2",
  TOP_PADDING: "pt-5",
  BOTTOM_SPACING: "h-8",

  // Positioning percentages
  // Centers the 24px toggle in the collapsed rail at any width
  COLLAPSED_LEFT_POSITION: "calc(50% - 12px)",
  EXPANDED_RIGHT_POSITION: "42px",

  // Transitions
  SIDEBAR_TRANSITION: "transition-all duration-300",
  TOGGLE_TRANSITION: "transition-all duration-150",
  RESET_TRANSITION: "top 2s ease-in-out",

  // Breakpoints (from theme)
  MOBILE_BREAKPOINT: parseInt(breakpoints.md), // 768px
  TABLET_BREAKPOINT: parseInt(breakpoints.lg), // 1024px
} as const;
