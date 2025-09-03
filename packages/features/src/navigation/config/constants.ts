// Navigation component constants
export const NAVIGATION_CONSTANTS = {
  // Positioning
  DEFAULT_MOUSE_Y: 60,
  MOUSE_BOUNDARY: 20,
  TOGGLE_VERTICAL_OFFSET: 18, // Half of toggle button height (h-6 = 24px, half = 12px, but we use 18 for better centering)
  
  // Timing
  AUTO_RESET_DELAY: 2000,
  ANIMATION_DURATION: 2000,
  
  // Sizing
  EXPANDED_WIDTH: "w-48", // 192px
  COLLAPSED_WIDTH: "w-[60px]",
  TOGGLE_SIZE: "sm",
  
  // Layout
  SIDEBAR_PADDING: "p-4",
  TOP_PADDING: "pt-12",
  BOTTOM_SPACING: "h-8",
  
  // Positioning percentages
  COLLAPSED_LEFT_POSITION: "25%",
  EXPANDED_RIGHT_POSITION: "42px",
  
  // Transitions
  SIDEBAR_TRANSITION: "transition-all duration-300",
  TOGGLE_TRANSITION: "transition-all duration-150",
  RESET_TRANSITION: "top 2s ease-in-out",
} as const;
