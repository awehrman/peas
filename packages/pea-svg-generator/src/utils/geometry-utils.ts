/**
 * Utility functions for geometry calculations
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Clamps a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculates distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalizes an angle to be between 0 and 2π
 */
export function normalizeAngle(angle: number): number {
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return angle;
}

/**
 * Calculates the distance between two angles
 */
export function angleDistance(angle1: number, angle2: number): number {
  const diff = Math.abs(normalizeAngle(angle1) - normalizeAngle(angle2));
  return Math.min(diff, Math.PI * 2 - diff);
}
