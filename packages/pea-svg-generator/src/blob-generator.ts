import type { BlobPeaConfig, PeaColor, PeaHighlight } from "./types.js";

export class BlobGenerator {
  private seed: number;

  constructor(seed: number = Math.random()) {
    this.seed = seed;
  }

  // Generate a random number based on seed for consistent shapes
  private random(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  // Chaikin's corner-cutting algorithm for smoothing
  private chaikinSmooth(
    points: Array<{ x: number; y: number }>,
    iterations: number = 2
  ): Array<{ x: number; y: number }> {
    let pts = points;
    for (let iter = 0; iter < iterations; iter++) {
      const newPts: Array<{ x: number; y: number }> = [];
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

  // Generate a perfectly smooth circle with one gentle poke, then smooth with Chaikin
  public generateBlobPath(
    width: number,
    height: number,
    complexity: number = 16
  ): string {
    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = width / 2;
    const radiusY = height / 2;

    // Create a mostly circular shape with one gentle indentation
    const points: Array<{ x: number; y: number }> = [];
    const numPoints = complexity;

    // Determine the poke angle and depth
    const pokeAngle = this.random() * Math.PI * 2;
    const pokeDepth = 0.08; // Slightly more pronounced poke for lower complexity
    const pokeWidth = 0.3; // Width of the poke effect

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

    // Apply Chaikin smoothing
    const smoothPoints = this.chaikinSmooth(points, 2);
    const numSmooth = smoothPoints.length;

    // Generate smooth path using cubic bezier curves
    let path = `M ${smoothPoints[0]!.x} ${smoothPoints[0]!.y}`;
    for (let i = 0; i < numSmooth; i++) {
      const current = smoothPoints[i]!;
      const next = smoothPoints[(i + 1) % numSmooth]!;
      const nextNext = smoothPoints[(i + 2) % numSmooth]!;
      // Calculate control points for smooth curves
      const cp1x =
        current.x +
        (next.x - smoothPoints[(i - 1 + numSmooth) % numSmooth]!.x) * 0.2;
      const cp1y =
        current.y +
        (next.y - smoothPoints[(i - 1 + numSmooth) % numSmooth]!.y) * 0.2;
      const cp2x = next.x - (nextNext.x - current.x) * 0.2;
      const cp2y = next.y - (nextNext.y - current.y) * 0.2;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    return path;
  }

  public generateBlobPea(config: BlobPeaConfig): string {
    const { width, height, color } = config;
    const path = this.generateBlobPath(width, height);
    return `<path d="${path}" fill="${color.base}" stroke="${color.stroke}" stroke-width="1"/>`;
  }
}
