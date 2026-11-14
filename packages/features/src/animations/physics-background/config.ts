/**
 * Physics configuration constants for the physics background
 */
export const PHYSICS_CONFIG = {
  NUM_PEAS: 5000,
  // Gaps between drops are exponentially distributed around the mean (like
  // rain), clamped to the min/max, so drops feel sprinkled rather than metered
  DROP_INTERVAL_MEAN: 220, // ms
  DROP_INTERVAL_MIN: 40, // ms
  DROP_INTERVAL_MAX: 600, // ms
  PEAS_PER_DROP_MIN: 1,
  PEAS_PER_DROP_MAX: 2,

  // Peas fall from a narrow zone that drops a few batches, then wanders
  // sideways by a fraction of the viewport width and drops again
  DROP_ZONE_WIDTH_MIN: 200, // px
  DROP_ZONE_WIDTH_MAX: 400, // px
  DROP_ZONE_SHIFT_MIN: 0.05, // fraction of viewport width
  DROP_ZONE_SHIFT_MAX: 0.25, // fraction of viewport width
  DROPS_PER_ZONE_MIN: 10,
  DROPS_PER_ZONE_MAX: 25,

  // On-screen pea diameter in CSS pixels
  PEA_DIAMETER_MIN: 20,
  PEA_DIAMETER_MAX: 48,

  // Physics properties
  RESTITUTION: 0.4, // Sleeping keeps settled piles still despite the bounce
  FRICTION: 0.4,
  FRICTION_STATIC: 0.8, // Lets resting peas hold their spot on a slope
  FRICTION_AIR: 0.015, // Caps fall speed at roughly 650px/s
  DENSITY: 0.001,

  // Solver accuracy; Matter's defaults (6/4) are too loose for tall stacks
  POSITION_ITERATIONS: 10,
  VELOCITY_ITERATIONS: 8,
  CONSTRAINT_ITERATIONS: 2,

  // Resting peas stop simulating, which removes stacking jitter
  ENABLE_SLEEPING: true,

  // Initial velocity
  INITIAL_VELOCITY_X_RANGE: 0.5, // Slight horizontal variation for natural movement
  INITIAL_VELOCITY_Y_MIN: 0.5,
  INITIAL_VELOCITY_Y_MAX: 1.0,

  // Gravity
  GRAVITY_X: 0,
  GRAVITY_Y: 0.6,

  // Collision tuning
  COLLISION_RADIUS_FACTOR: 0.85, // Shrink physics body to better match visual pea

  // Walls
  WALL_THICKNESS: 100,

  // Mouse interaction
  MOUSE_RADIUS: 30, // Radius of invisible mouse collider

  // Performance
  CULLING_MARGIN: 100, // Extra margin for smooth transitions
} as const;

/**
 * Pea generator configuration. The generator sizes peas to fit a grid, so
 * the canvas size and `peasPerRow` set sprite resolution (~75-115px here, enough
 * for retina at the largest on-screen size); the on-screen size comes from
 * `PHYSICS_CONFIG.PEA_DIAMETER_*`.
 */
export const PEA_GENERATOR_CONFIG = {
  width: 2000,
  height: 2000,
  peasPerRow: 15,
  margin: 50,
  useBlobs: true,
  peaCount: 200,
} as const;
