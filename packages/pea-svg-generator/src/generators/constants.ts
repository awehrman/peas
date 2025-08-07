import type { HighlightConfig } from "./types.js";

/**
 * Default highlight configuration
 */
export const DEFAULT_HIGHLIGHT_CONFIG: HighlightConfig = {
  minScale: 0.1,
  maxScale: 0.2,
  clusterSpread: 0.7,
  nudgeIntensity: 0.3,
  maxSafeDistance: 0.6,
};
