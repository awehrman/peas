import { PHYSICS_CONFIG } from "./config.js";
import { peaManager } from "./pea-manager.js";
import type { PeaBody } from "./physics-engine.js";

/**
 * Handles canvas rendering for the physics background. Drawing happens in
 * CSS pixels; the backing store is scaled by devicePixelRatio for sharpness.
 */
export class PhysicsRenderer {
  private canvas: HTMLCanvasElement;
  private width = 0;
  private height = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /**
   * Size the canvas backing store to match its CSS size
   */
  public resize(width: number, height: number): void {
    const pixelRatio = window.devicePixelRatio || 1;

    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * pixelRatio);
    this.canvas.height = Math.round(height * pixelRatio);
    this.canvas.getContext("2d")?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  /**
   * Draw all peas
   */
  public drawPeas(bodies: PeaBody[]): void {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, this.width, this.height);

    bodies.forEach((body) => {
      this.drawPeaIfVisible(ctx, body);
    });
  }

  /**
   * Draw a single pea, rotated about its center, if it's visible
   */
  private drawPeaIfVisible(ctx: CanvasRenderingContext2D, body: PeaBody): void {
    if (!this.isPeaVisible(body)) return;

    const pea = peaManager.getPea(body.peaIdx);
    const img = peaManager.getPeaImage(body.peaIdx);
    if (!pea || !img) return;

    const drawWidth = pea.width * body.drawScale;
    const drawHeight = pea.height * body.drawScale;

    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }

  /**
   * Check if a pea is visible on screen
   */
  private isPeaVisible(body: PeaBody): boolean {
    const margin = PHYSICS_CONFIG.CULLING_MARGIN;
    return (
      body.position.x >= -margin &&
      body.position.x <= this.width + margin &&
      body.position.y >= -margin &&
      body.position.y <= this.height + margin
    );
  }
}
