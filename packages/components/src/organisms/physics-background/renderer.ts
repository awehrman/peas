import Matter from "matter-js";
import { PHYSICS_CONFIG } from "./config.js";
import { peaManager } from "./pea-manager.js";

/**
 * Handles canvas rendering for the physics background
 */
export class PhysicsRenderer {
  private canvas: HTMLCanvasElement;
  private isRunning = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /**
   * Start the rendering loop
   */
  public start(): void {
    this.isRunning = true;
    this.draw();
  }

  /**
   * Stop the rendering loop
   */
  public stop(): void {
    this.isRunning = false;
  }

  /**
   * Main drawing loop
   */
  private draw(): void {
    if (!this.isRunning) return;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    requestAnimationFrame(() => this.draw());
  }

  /**
   * Draw all peas
   */
  public drawPeas(bodies: Matter.Body[]): void {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    bodies.forEach((body) => {
      this.drawPeaIfVisible(ctx, body);
    });
  }

  /**
   * Draw a single pea if it's visible
   */
  private drawPeaIfVisible(
    ctx: CanvasRenderingContext2D,
    body: Matter.Body
  ): void {
    // Only draw peas that are visible (culling for performance)
    if (!this.isPeaVisible(body)) return;

    const peaIdx = (body as any).peaIdx as number;
    const sizeScale = (body as any).sizeScale as number;

    if (typeof peaIdx !== "number" || typeof sizeScale !== "number") return;

    const pea = peaManager.getPea(peaIdx);
    const img = peaManager.getPeaImage(peaIdx);

    if (!pea || !img) return;

    const { width, height } = pea;
    const drawWidth = width / sizeScale;
    const drawHeight = height / sizeScale;

    ctx.save();
    ctx.translate(
      body.position.x - drawWidth / 2,
      body.position.y - drawHeight / 2
    );
    ctx.rotate(body.angle);
    ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
    ctx.restore();
  }

  /**
   * Check if a pea is visible on screen
   */
  private isPeaVisible(body: Matter.Body): boolean {
    const margin = PHYSICS_CONFIG.CULLING_MARGIN;
    return (
      body.position.x >= -margin &&
      body.position.x <= this.canvas.width + margin &&
      body.position.y >= -margin &&
      body.position.y <= this.canvas.height + margin
    );
  }

  /**
   * Update canvas size
   */
  public updateCanvasSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
