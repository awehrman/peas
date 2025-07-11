/**
 * Physics configuration constants for the physics background
 */
export const PHYSICS_CONFIG = {
  NUM_PEAS: 5000,
  DROP_INTERVAL_MIN: 800, // ms - increased from 200
  DROP_INTERVAL_MAX: 2000, // ms - increased from 1000

  // Physics properties
  RESTITUTION: 0.4, // Less bouncy for more realistic behavior
  FRICTION: 0.1, // Add some friction for more realistic motion
  FRICTION_AIR: 0.0005, // Lower air resistance to let gravity dominate longer
  DENSITY: 0.001, // Consistent density
  INERTIA: 1000, // Allow some rotation but not chaotic

  // Initial velocity
  INITIAL_VELOCITY_X_RANGE: 0.5, // Slight horizontal variation for natural movement
  INITIAL_VELOCITY_Y_MIN: 0.5, // Minimum initial velocity
  INITIAL_VELOCITY_Y_MAX: 1.0, // Maximum initial velocity

  // Gravity
  GRAVITY_X: 0,
  GRAVITY_Y: 1.4, // Higher gravity for more realistic acceleration

  // Size variation
  SIZE_SCALE_MIN: 1.5,
  SIZE_SCALE_MAX: 3.5,

  // Performance
  CULLING_MARGIN: 100, // Extra margin for smooth transitions
} as const;

/**
 * Pea generator configuration
 */
export const PEA_GENERATOR_CONFIG = {
  width: 1000,
  height: 1000,
  peasPerRow: 3,
  margin: 50,
  useBlobs: true,
  peaCount: 200,
} as const;
