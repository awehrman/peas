import { PHYSICS_CONFIG } from "./config.js";
import { peaManager } from "./pea-manager.js";

import Matter from "matter-js";

/**
 * A physics body carrying the sprite it should be drawn with
 */
export interface PeaBody extends Matter.Body {
  peaIdx: number;
  /** Multiplier from the sprite's native size to its on-screen size */
  drawScale: number;
}

/**
 * Manages the physics engine and pea bodies. All coordinates are CSS pixels.
 *
 * Lifecycle: peas drop in batches until settled peas reach the top of the
 * viewport everywhere, then the simulation runs until every pea is asleep
 * and `isSettled()` reports true so the caller can `freeze()` it.
 */
export class PhysicsEngine {
  private engine: Matter.Engine | null = null;
  private runner: Matter.Runner | null = null;
  private bodies: PeaBody[] = [];
  private walls: Matter.Body[] = [];
  private mouseBody: Matter.Body | null = null;
  private mouseMoveListener?: (e: MouseEvent) => void;
  private isDropping = false;
  private nextDropAt = 0;
  private width = 0;
  private height = 0;

  /**
   * Initialize the physics engine
   */
  public initialize(
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ): void {
    this.width = width;
    this.height = height;

    this.engine = Matter.Engine.create({
      gravity: {
        x: PHYSICS_CONFIG.GRAVITY_X,
        y: PHYSICS_CONFIG.GRAVITY_Y,
      },
      enableSleeping: PHYSICS_CONFIG.ENABLE_SLEEPING,
      constraintIterations: PHYSICS_CONFIG.CONSTRAINT_ITERATIONS,
      positionIterations: PHYSICS_CONFIG.POSITION_ITERATIONS,
      velocityIterations: PHYSICS_CONFIG.VELOCITY_ITERATIONS,
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

    this.mouseMoveListener = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const position = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (this.mouseBody) {
        Matter.Body.setPosition(this.mouseBody, position);
      }
      this.wakePeasNear(position);
    };
    window.addEventListener("mousemove", this.mouseMoveListener);

    this.createContainmentWalls();
  }

  /**
   * Matter skips collisions between static and sleeping bodies, so peas
   * under the static mouse collider must be woken for it to push them.
   */
  private wakePeasNear(position: Matter.Vector): void {
    const reach = PHYSICS_CONFIG.MOUSE_RADIUS + PHYSICS_CONFIG.PEA_DIAMETER_MAX;
    const bounds = {
      min: { x: position.x - reach, y: position.y - reach },
      max: { x: position.x + reach, y: position.y + reach },
    };
    Matter.Query.region(this.bodies, bounds).forEach((body) =>
      Matter.Sleeping.set(body, false)
    );
  }

  /**
   * Create a floor and side walls. There is no ceiling: peas spawn above the
   * viewport, so the side walls extend a full screen height above it.
   */
  private createContainmentWalls(): void {
    if (!this.engine) return;

    const { width, height } = this;
    const thickness = PHYSICS_CONFIG.WALL_THICKNESS;
    const wallHeight = height * 2;

    this.walls = [
      Matter.Bodies.rectangle(
        width / 2,
        height + thickness / 2,
        width + thickness * 2,
        thickness,
        { isStatic: true }
      ),
      Matter.Bodies.rectangle(-thickness / 2, 0, thickness, wallHeight, {
        isStatic: true,
      }),
      Matter.Bodies.rectangle(width + thickness / 2, 0, thickness, wallHeight, {
        isStatic: true,
      }),
    ];

    Matter.Composite.add(this.engine.world, this.walls);
  }

  /**
   * Start creating peas
   */
  public startPeaCreation(): void {
    if (!this.engine) return;

    this.isDropping = true;
    this.nextDropAt = this.engine.timing.timestamp;
    Matter.Events.on(this.engine, "afterUpdate", this.handleAfterUpdate);
  }

  /**
   * Drops are timed on the simulation clock rather than with timers, so a
   * backgrounded tab (where the runner pauses) doesn't queue up peas that
   * all spawn on top of each other when it returns.
   */
  private handleAfterUpdate = (): void => {
    if (!this.engine || !this.isDropping) return;

    const now = this.engine.timing.timestamp;
    if (now < this.nextDropAt) return;

    if (
      this.bodies.length >= PHYSICS_CONFIG.NUM_PEAS ||
      this.isViewportCovered()
    ) {
      this.isDropping = false;
      return;
    }

    this.dropBatch();
    this.nextDropAt = now + randomDropInterval();
  };

  /**
   * The viewport is covered once every vertical strip has a settled pea at or
   * above the top edge.
   */
  private isViewportCovered(): boolean {
    const stripWidth = PHYSICS_CONFIG.PEA_DIAMETER_MAX;
    const stripCount = Math.max(1, Math.ceil(this.width / stripWidth));
    const coveredStrips = new Set<number>();

    this.bodies.forEach((body) => {
      if (!body.isSleeping || body.position.y > 0) return;
      const strip = Math.floor(body.position.x / stripWidth);
      coveredStrips.add(Math.min(stripCount - 1, Math.max(0, strip)));
    });

    return coveredStrips.size === stripCount;
  }

  /**
   * Drop a handful of peas at once
   */
  private dropBatch(): void {
    const batchSize = Math.floor(
      randomBetween(
        PHYSICS_CONFIG.PEAS_PER_DROP_MIN,
        PHYSICS_CONFIG.PEAS_PER_DROP_MAX + 1
      )
    );
    const remaining = PHYSICS_CONFIG.NUM_PEAS - this.bodies.length;

    for (let slot = 0; slot < Math.min(batchSize, remaining); slot++) {
      this.createPea(slot);
    }
  }

  /**
   * Create a single pea. Peas spawn two diameters above the viewport so they
   * clear a pile that has just reached the top, and each slot in a batch
   * spawns one diameter higher so batch-mates never start overlapping.
   */
  private createPea(slot: number): void {
    if (!this.engine) return;

    const peaIdx = peaManager.getRandomPeaIndex();
    const pea = peaManager.getPea(peaIdx);
    if (!pea) return;

    const diameter = randomBetween(
      PHYSICS_CONFIG.PEA_DIAMETER_MIN,
      PHYSICS_CONFIG.PEA_DIAMETER_MAX
    );
    const drawScale = diameter / Math.max(pea.width, pea.height);
    const radius = (diameter / 2) * PHYSICS_CONFIG.COLLISION_RADIUS_FACTOR;
    const spawnMargin = PHYSICS_CONFIG.PEA_DIAMETER_MAX;

    const body = Matter.Bodies.circle(
      randomBetween(spawnMargin, Math.max(spawnMargin, this.width - spawnMargin)),
      -spawnMargin * (slot + 2),
      radius,
      {
        restitution: PHYSICS_CONFIG.RESTITUTION,
        friction: PHYSICS_CONFIG.FRICTION,
        frictionStatic: PHYSICS_CONFIG.FRICTION_STATIC,
        frictionAir: PHYSICS_CONFIG.FRICTION_AIR,
        density: PHYSICS_CONFIG.DENSITY,
      }
    );
    const peaBody = Object.assign(body, { peaIdx, drawScale });

    // Give peas initial velocity with variation
    Matter.Body.setVelocity(peaBody, {
      x: (Math.random() - 0.5) * PHYSICS_CONFIG.INITIAL_VELOCITY_X_RANGE,
      y: randomBetween(
        PHYSICS_CONFIG.INITIAL_VELOCITY_Y_MIN,
        PHYSICS_CONFIG.INITIAL_VELOCITY_Y_MAX
      ),
    });

    this.bodies.push(peaBody);
    Matter.Composite.add(this.engine.world, peaBody);
  }

  /**
   * Start the physics engine
   */
  public start(): void {
    if (!this.engine) return;

    this.runner = Matter.Runner.create();
    Matter.Runner.run(this.runner, this.engine);
  }

  /**
   * True once dropping has finished and every pea has come to rest
   */
  public isSettled(): boolean {
    return (
      !this.isDropping &&
      this.bodies.length > 0 &&
      this.bodies.every((body) => body.isSleeping)
    );
  }

  /**
   * Halt the simulation and mouse interaction, keeping the peas in place so
   * they can still be drawn
   */
  public freeze(): void {
    this.isDropping = false;

    if (this.runner) {
      Matter.Runner.stop(this.runner);
      this.runner = null;
    }

    if (this.engine) {
      Matter.Events.off(this.engine, "afterUpdate", this.handleAfterUpdate);
    }

    if (this.mouseMoveListener) {
      window.removeEventListener("mousemove", this.mouseMoveListener);
      this.mouseMoveListener = undefined;
    }
  }

  /**
   * Stop the physics engine and release everything
   */
  public stop(): void {
    this.freeze();

    if (this.engine) {
      Matter.Engine.clear(this.engine);
    }

    this.bodies = [];
    this.walls = [];

    if (this.mouseBody && this.engine) {
      Matter.Composite.remove(this.engine.world, this.mouseBody);
      this.mouseBody = null;
    }
  }

  /**
   * Get all bodies
   */
  public getBodies(): PeaBody[] {
    return this.bodies;
  }

  /**
   * Rebuild the containment walls for a new viewport size
   */
  public resize(width: number, height: number): void {
    if (!this.engine) return;

    this.width = width;
    this.height = height;

    Matter.Composite.remove(this.engine.world, this.walls);
    this.createContainmentWalls();

    // Peas resting on the old floor need to fall to the new one
    this.bodies.forEach((body) => Matter.Sleeping.set(body, false));
  }
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomDropInterval(): number {
  const exponential =
    -Math.log(1 - Math.random()) * PHYSICS_CONFIG.DROP_INTERVAL_MEAN;
  return Math.min(
    PHYSICS_CONFIG.DROP_INTERVAL_MAX,
    Math.max(PHYSICS_CONFIG.DROP_INTERVAL_MIN, exponential)
  );
}
