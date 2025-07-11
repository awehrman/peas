import type { BlobPeaConfig } from "../types.js";
import { Point } from "../utils/geometry-utils.js";

/**
 * Configuration for blob shape generation
 */
interface BlobShapeConfig {
  width: number;
  height: number;
  complexity: number;
  pokeDepth: number;
  pokeWidth: number;
  smoothingIterations: number;
}

/**
 * Default blob shape configuration
 */
const DEFAULT_BLOB_SHAPE_CONFIG: BlobShapeConfig = {
  width: 70,
  height: 64,
  complexity: 16,
  pokeDepth: 0.08,
  pokeWidth: 0.3,
  smoothingIterations: 2,
};

/**
 * Generates organic blob shapes for peas
 */
export class BlobShapeGenerator {
  private seed: number;

  constructor(seed: number = Math.random()) {
    this.seed = seed;
  }

  /**
   * Generates a random number based on seed for consistent shapes
   */
  private random(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Applies Chaikin's corner-cutting algorithm for smoothing
   */
  private chaikinSmooth(
    points: Point[],
    iterations: number = DEFAULT_BLOB_SHAPE_CONFIG.smoothingIterations
  ): Point[] {
    let pts = points;

    for (let iter = 0; iter < iterations; iter++) {
      const newPts: Point[] = [];

      for (let i = 0; i < pts.length; i++) {
        const p0 = pts[i]!;
        const p1 = pts[(i + 1) % pts.length]!;

        // Q point (closer to p0)
        newPts.push({
          x: 0.75 * p0.x + 0.25 * p1.x,
          y: 0.75 * p0.y + 0.25 * p1.y,
        });

        // R point (closer to p1)
        newPts.push({
          x: 0.25 * p0.x + 0.75 * p1.x,
          y: 0.25 * p0.y + 0.75 * p1.y,
        });
      }

      pts = newPts;
    }

    return pts;
  }

  /**
   * Generates the base circular points with a gentle indentation
   */
  private generateBasePoints(config: BlobShapeConfig): Point[] {
    const { width, height, complexity, pokeDepth, pokeWidth } = config;
    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = width / 2;
    const radiusY = height / 2;

    const points: Point[] = [];
    const numPoints = complexity;

    // Determine the poke angle and depth
    const pokeAngle = this.random() * Math.PI * 2;

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const distanceFromPoke = Math.abs(angle - pokeAngle);
      const normalizedDistance = Math.min(
        distanceFromPoke / (Math.PI * pokeWidth),
        1
      );

      // Create a smooth poke effect using cosine interpolation
      const pokeEffect = Math.cos(normalizedDistance * Math.PI) * 0.5 + 0.5;
      const radius = 1 - pokeEffect * pokeDepth;

      const x = centerX + Math.cos(angle) * radiusX * radius;
      const y = centerY + Math.sin(angle) * radiusY * radius;

      points.push({ x, y });
    }

    return points;
  }

  /**
   * Converts points to a smooth SVG path using cubic bezier curves
   */
  private pointsToPath(points: Point[]): string {
    const numPoints = points.length;
    let path = `M ${points[0]!.x} ${points[0]!.y}`;

    for (let i = 0; i < numPoints; i++) {
      const current = points[i]!;
      const next = points[(i + 1) % numPoints]!;
      const nextNext = points[(i + 2) % numPoints]!;

      // Calculate control points for smooth curves
      const cp1x =
        current.x + (next.x - points[(i - 1 + numPoints) % numPoints]!.x) * 0.2;
      const cp1y =
        current.y + (next.y - points[(i - 1 + numPoints) % numPoints]!.y) * 0.2;
      const cp2x = next.x - (nextNext.x - current.x) * 0.2;
      const cp2y = next.y - (nextNext.y - current.y) * 0.2;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }

    return path;
  }

  /**
   * Generates a blob path with the specified dimensions and complexity
   */
  public generateBlobPath(
    width: number,
    height: number,
    complexity: number = DEFAULT_BLOB_SHAPE_CONFIG.complexity
  ): string {
    const config: BlobShapeConfig = {
      ...DEFAULT_BLOB_SHAPE_CONFIG,
      width,
      height,
      complexity,
    };

    // Generate base points with indentation
    const basePoints = this.generateBasePoints(config);

    // Apply smoothing
    const smoothPoints = this.chaikinSmooth(
      basePoints,
      config.smoothingIterations
    );

    // Convert to SVG path
    return this.pointsToPath(smoothPoints);
  }

  /**
   * Generates a complete blob pea SVG element
   */
  public generateBlobPea(config: BlobPeaConfig): string {
    const { width, height, color } = config;
    const path = this.generateBlobPath(width, height);

    return `<path d="${path}" fill="${color.base}" stroke="${color.stroke}" stroke-width="1"/>`;
  }
}
