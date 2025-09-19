import { PHYSICS_CONFIG } from "./config.js";
import { peaManager } from "./pea-manager.js";

import Matter from "matter-js";

/**
 * Manages the physics engine and pea bodies
 */
export class PhysicsEngine {
  private engine: Matter.Engine | null = null;
  private bodies: Matter.Body[] = [];
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private mouseBody: Matter.Body | null = null;
  private mouseMoveListener?: (e: MouseEvent) => void;
  private isRunning = false;

  /**
   * Initialize the physics engine
   */
  public initialize(canvas: HTMLCanvasElement): void {
    this.engine = Matter.Engine.create({
      gravity: {
        x: PHYSICS_CONFIG.GRAVITY_X,
        y: PHYSICS_CONFIG.GRAVITY_Y,
      },
      // Standard physics iterations
      constraintIterations: 2,
      positionIterations: 4,
      velocityIterations: 2,
    });

    // --- Mouse interaction (collision only) ---
    // Invisible circular body that follows the mouse and collides with peas
    this.mouseBody = Matter.Bodies.circle(
      -1000,
      -1000,
      PHYSICS_CONFIG.MOUSE_RADIUS,
      {
        isStatic: true,
        restitution: PHYSICS_CONFIG.RESTITUTION,
        frictionAir: 0,
        render: { visible: false },
      }
    );
    Matter.Composite.add(this.engine.world, this.mouseBody);

    // Track mouse position relative to canvas
    this.mouseMoveListener = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      if (this.mouseBody) {
        Matter.Body.setPosition(this.mouseBody, { x, y });
      }
    };
    window.addEventListener("mousemove", this.mouseMoveListener);

    this.createContainmentWalls(canvas);
  }

  /**
   * Create containment walls for the physics world
   */
  private createContainmentWalls(canvas: HTMLCanvasElement): void {
    if (!this.engine) return;

    const ground = Matter.Bodies.rectangle(
      canvas.width / 2,
      canvas.height + 50, // Position 20px above canvas height to account for pea radius
      canvas.width,
      100,
      { isStatic: true }
    );
    const leftWall = Matter.Bodies.rectangle(
      -50,
      canvas.height / 2,
      100,
      canvas.height,
      { isStatic: true }
    );
    const rightWall = Matter.Bodies.rectangle(
      canvas.width + 50,
      canvas.height / 2,
      100,
      canvas.height,
      { isStatic: true }
    );
    const ceiling = Matter.Bodies.rectangle(
      canvas.width / 2,
      -50,
      canvas.width,
      100,
      { isStatic: true }
    );

    Matter.Composite.add(this.engine.world, [
      ground,
      leftWall,
      rightWall,
      ceiling,
    ]);
  }

  /**
   * Start creating peas
   */
  public startPeaCreation(
    canvas: HTMLCanvasElement,
    onPeaCreated?: (body: Matter.Body) => void
  ): void {
    if (!this.engine) return;

    this.isRunning = true;
    this.createPea(0, canvas, onPeaCreated);
  }

  /**
   * Create a single pea
   */
  private createPea(
    index: number,
    canvas: HTMLCanvasElement,
    onPeaCreated?: (body: Matter.Body) => void
  ): void {
    if (!this.engine || !this.isRunning) return;

    const peaIdx = peaManager.getRandomPeaIndex();
    const pea = peaManager.getPea(peaIdx);
    if (!pea) return;

    // Random size variation
    const sizeScale =
      Math.random() *
        (PHYSICS_CONFIG.SIZE_SCALE_MAX - PHYSICS_CONFIG.SIZE_SCALE_MIN) +
      PHYSICS_CONFIG.SIZE_SCALE_MIN;
    const baseRadius = Math.max(pea.width, pea.height) / 2 / sizeScale;
    const radius = baseRadius * PHYSICS_CONFIG.COLLISION_RADIUS_FACTOR;

    const body = Matter.Bodies.circle(
      Math.random() * (canvas.width - 100) + 50,
      -50, // Start above the canvas
      radius,
      {
        restitution: PHYSICS_CONFIG.RESTITUTION,
        friction: PHYSICS_CONFIG.FRICTION,
        frictionAir: PHYSICS_CONFIG.FRICTION_AIR,
        density: PHYSICS_CONFIG.DENSITY,
        inertia: PHYSICS_CONFIG.INERTIA,
      }
    );

    // Give peas initial velocity with variation
    Matter.Body.setVelocity(body, {
      x: (Math.random() - 0.5) * PHYSICS_CONFIG.INITIAL_VELOCITY_X_RANGE,
      y:
        Math.random() *
          (PHYSICS_CONFIG.INITIAL_VELOCITY_Y_MAX -
            PHYSICS_CONFIG.INITIAL_VELOCITY_Y_MIN) +
        PHYSICS_CONFIG.INITIAL_VELOCITY_Y_MIN,
    });

    // Store metadata on the body
    (body as Matter.Body & { peaIdx?: number; sizeScale?: number }).peaIdx =
      peaIdx;
    (body as Matter.Body & { peaIdx?: number; sizeScale?: number }).sizeScale =
      sizeScale;

    this.bodies.push(body);
    Matter.Composite.add(this.engine.world, body);

    // Call callback if provided
    if (onPeaCreated) {
      onPeaCreated(body);
    }

    // Schedule next pea
    if (index + 1 < PHYSICS_CONFIG.NUM_PEAS) {
      const randomDelay =
        Math.random() *
          (PHYSICS_CONFIG.DROP_INTERVAL_MAX -
            PHYSICS_CONFIG.DROP_INTERVAL_MIN) +
        PHYSICS_CONFIG.DROP_INTERVAL_MIN;
      const timeout = setTimeout(
        () => this.createPea(index + 1, canvas, onPeaCreated),
        randomDelay
      );
      this.timeouts.push(timeout);
    }
  }

  /**
   * Start the physics engine
   */
  public start(): Matter.Runner | null {
    if (!this.engine) return null;

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, this.engine);
    return runner;
  }

  /**
   * Stop the physics engine
   */
  public stop(runner?: Matter.Runner): void {
    this.isRunning = false;

    if (runner) {
      Matter.Runner.stop(runner);
    }

    if (this.engine) {
      Matter.Engine.clear(this.engine);
    }

    // Clear all timeouts
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts = [];

    // Clear all bodies
    this.bodies = [];

    // Remove mouse event listener and body
    if (this.mouseMoveListener) {
      window.removeEventListener("mousemove", this.mouseMoveListener);
      this.mouseMoveListener = undefined;
    }
    if (this.mouseBody && this.engine) {
      Matter.Composite.remove(this.engine.world, this.mouseBody);
      this.mouseBody = null;
    }
  }

  /**
   * Get all bodies
   */
  public getBodies(): Matter.Body[] {
    return this.bodies;
  }

  /**
   * Update containment walls for new canvas size
   */
  public updateContainmentWalls(canvas: HTMLCanvasElement): void {
    if (!this.engine) return;

    const world = this.engine.world;
    const bodies = Matter.Composite.allBodies(world);

    // Find and update wall positions
    bodies.forEach((body) => {
      if (body.isStatic) {
        if (body.position.y > canvas.height) {
          // Ground
          Matter.Body.setPosition(body, {
            x: canvas.width / 2,
            y: canvas.height + 50,
          });
          Matter.Body.setVertices(
            body,
            Matter.Bodies.rectangle(
              canvas.width / 2,
              canvas.height + 50,
              canvas.width,
              100
            ).vertices
          );
        } else if (body.position.x < 0) {
          // Left wall
          Matter.Body.setPosition(body, { x: -50, y: canvas.height / 2 });
          Matter.Body.setVertices(
            body,
            Matter.Bodies.rectangle(-50, canvas.height / 2, 100, canvas.height)
              .vertices
          );
        } else if (body.position.x > canvas.width) {
          // Right wall
          Matter.Body.setPosition(body, {
            x: canvas.width + 50,
            y: canvas.height / 2,
          });
          Matter.Body.setVertices(
            body,
            Matter.Bodies.rectangle(
              canvas.width + 50,
              canvas.height / 2,
              100,
              canvas.height
            ).vertices
          );
        } else if (body.position.y < 0) {
          // Ceiling
          Matter.Body.setPosition(body, { x: canvas.width / 2, y: -50 });
          Matter.Body.setVertices(
            body,
            Matter.Bodies.rectangle(canvas.width / 2, -50, canvas.width, 100)
              .vertices
          );
        }
      }
    });
  }
}
