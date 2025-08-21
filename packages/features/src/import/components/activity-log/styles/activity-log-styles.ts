// Centralized styling configuration for activity log components
// Easy to adjust margins, padding, colors, and spacing

export const ACTIVITY_LOG_STYLES = {
  // Container spacing
  container: {
    spacing: "space-y-3",
    padding: "p-0",
  },

  // Progress bar styling
  progressBar: {
    container: "space-y-2",
    bar: "w-full bg-gray-200 rounded-full h-2",
    fill: "h-2 rounded-full transition-all duration-300",
    colors: {
      completed: "bg-green-500",
      processing: "bg-blue-500",
      failed: "bg-red-500",
    },
  },

  // Steps container
  steps: {
    container: "space-y-0 pl-[20px]",
    compact: "space-y-0",
  },

  // Individual step styling
  step: {
    container: "flex items-center space-x-8",
    content: "flex-1 min-w-0 mb-4",
    header: "flex items-center justify-between",
    title: "text-sm font-medium truncate leading-none",
    progress: "text-xs text-gray-500 ml-2 leading-none mb-2",
    message: "text-xs text-gray-600 -mt-3 truncate leading-none",
  },

  // Status icon styling
  statusIcon: {
    container: "flex-shrink-0 pt-2",
    sizes: {
      sm: "w-3 h-3",
      md: "w-4 h-4",
      lg: "w-5 h-5",
    },
    text: {
      sm: "text-xs",
      md: "text-xs",
      lg: "text-sm",
    },
    base: "rounded-full flex items-center justify-center font-bold text-white",
  },

  // Step-specific status icon styling
  stepStatusIcon: {
    container: "flex-shrink-0 pt-3 -mt-3",
  },

  // Progress bar for individual steps
  stepProgress: {
    container: "mt-1 w-full bg-gray-200 rounded-full h-1",
    fill: "h-1 rounded-full transition-all duration-300",
    colors: {
      completed: "bg-green-500",
      processing: "bg-blue-500",
      failed: "bg-red-500",
      pending: "bg-gray-300",
    },
  },

  // Summary section
  summary: {
    container:
      "flex items-center justify-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-200",
    failed: "text-red-600 font-medium",
  },

  // Collapsible item styling
  collapsible: {
    container: "rounded-lg border border-gray-200 overflow-hidden",
    button:
      "w-full text-left flex items-center space-x-3 p-4 hover:bg-gray-200 transition-colors", // 🎯 ADJUST BUTTON PADDING HERE
    content: "border-t border-gray-200 bg-white",
    statusIcon: "flex-shrink-0", // 🎯 ADJUST STATUS ICON CONTAINER HERE
  },

  // Upload item styling
  upload: {
    container: "flex items-center space-x-3 p-3 rounded",
    spinner:
      "animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600",
  },
} as const;

// Icon positioning configuration - easy to adjust
export const ICON_POSITIONING = {
  checkmark: "translate-x-[0px] translate-y-[2px]",
  processing: "translate-x-[0px] translate-y-[-2px]",
  duplicate: "translate-x-[0px] translate-y-[1px]",
  failed: "",
  pending: "",
} as const;

// Color schemes - easy to customize
export const COLOR_SCHEMES = {
  status: {
    completed: {
      background: "bg-green-500",
      text: "text-green-700",
      textDark: "text-green-800",
    },
    processing: {
      background: "bg-blue-500",
      text: "text-blue-700",
      textDark: "text-blue-800",
    },
    failed: {
      background: "bg-red-500",
      text: "text-red-700",
      textDark: "text-red-800",
    },
    pending: {
      background: "bg-gray-300",
      text: "text-gray-500",
      textDark: "text-gray-800",
    },
    duplicate: {
      background: "bg-amber-500",
      text: "text-amber-700",
      textDark: "text-amber-800",
    },
  },
} as const;
