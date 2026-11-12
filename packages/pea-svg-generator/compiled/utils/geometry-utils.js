/**
 * Utility functions for geometry calculations
 */
/**
 * Clamps a value between min and max
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
/**
 * Calculates distance between two points
 */
export function distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}
/**
 * Normalizes an angle to be between 0 and 2π
 */
export function normalizeAngle(angle) {
    while (angle < 0)
        angle += Math.PI * 2;
    while (angle >= Math.PI * 2)
        angle -= Math.PI * 2;
    return angle;
}
/**
 * Calculates the distance between two angles
 */
export function angleDistance(angle1, angle2) {
    const diff = Math.abs(normalizeAngle(angle1) - normalizeAngle(angle2));
    return Math.min(diff, Math.PI * 2 - diff);
}
