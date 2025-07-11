"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";
import { PeaGenerator, type PeaConfig } from "@peas/pea-svg-generator";

interface PhysicsBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

// Physics configuration constants
const PHYSICS_CONFIG = {
  // Pea creation
  NUM_PEAS: 1000,
  DROP_INTERVAL_MIN: 200, // ms
  DROP_INTERVAL_MAX: 1000, // ms

  // Physics properties
  RESTITUTION: 0.6, // Slightly less bouncy for realistic behavior
  FRICTION: 0, // No friction for consistent motion
  FRICTION_AIR: 0, // No air resistance for consistent speed
  DENSITY: 0.001, // Consistent density
  INERTIA: Infinity, // Prevent rotation

  // Initial velocity
  INITIAL_VELOCITY_X_RANGE: 0, // No horizontal variation
  INITIAL_VELOCITY_Y: 3, // Higher consistent downward velocity

  // Gravity
  GRAVITY_X: 0,
  GRAVITY_Y: 1, // No gravity - use only constant velocity

  // Size variation
  SIZE_SCALE_MIN: 1.5,
  SIZE_SCALE_MAX: 3.5,

  // Performance
  CULLING_MARGIN: 100, // Extra margin for smooth transitions
} as const;

// Pre-generate a pool of pea configurations for performance
let PEA_POOL: PeaConfig[] = [];

// Generate SVG string for a pea config
function peaConfigToSVG(pea: PeaConfig): string {
  const { rx, ry, color, highlights } = pea;
  const width = rx * 2 + 20;
  const height = ry * 2 + 20;
  const cx = width / 2;
  const cy = height / 2;
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color.base}" stroke="${color.stroke}" stroke-width="1"/>`;
  highlights.forEach((h) => {
    svg += `<ellipse cx="${cx + h.x}" cy="${cy + h.y}" rx="${h.rx}" ry="${h.ry}" fill="${h.color || color.highlight}" opacity="${h.opacity}"/>`;
  });
  svg += `</svg>`;
  return svg;
}

// Create an Image for each pea config
function createPeaImages(peas: PeaConfig[]): HTMLImageElement[] {
  return peas.map((pea) => {
    const img = new window.Image();
    const svg = peaConfigToSVG(pea);
    img.src = `data:image/svg+xml;base64,${btoa(svg)}`;
    return img;
  });
}

// Initialize the pea pool and images
let PEA_IMAGES: HTMLImageElement[] = [];
function initializePeaPoolAndImages() {
  if (PEA_POOL.length === 0) {
    const generator = new PeaGenerator({
      width: 1000,
      height: 1000,
      peasPerRow: 3,
      margin: 50,
    });
    PEA_POOL = generator.generatePeaConfigs();
    if (typeof window !== "undefined") {
      PEA_IMAGES = createPeaImages(PEA_POOL);
    }
  }
}

function getRandomPeaIndex(): number {
  if (PEA_POOL.length === 0) {
    initializePeaPoolAndImages();
  }
  if (PEA_POOL.length === 0) return 0;
  return Math.floor(Math.random() * PEA_POOL.length);
}

// Type guard for defined values
function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function PhysicsBackground({
  children,
  className = "",
}: PhysicsBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const bodiesRef = useRef<Matter.Body[]>([]);
  const peaIndicesRef = useRef<number[]>([]); // Track which pea image for each body
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]); // Track timeouts for cleanup
  const isInitializedRef = useRef(false); // Track if physics is already initialized

  // Setup physics and pea images
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) {
      return;
    }

    // Prevent re-initialization if already running
    if (isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;
    initializePeaPoolAndImages();

    const container = containerRef.current;
    const canvas = canvasRef.current;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const engine = Matter.Engine.create({
      gravity: {
        x: PHYSICS_CONFIG.GRAVITY_X,
        y: PHYSICS_CONFIG.GRAVITY_Y,
      },
    });
    engineRef.current = engine;

    // Create ground and walls with containment
    const ground = Matter.Bodies.rectangle(
      canvas.width / 2,
      canvas.height + 50,
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
    Matter.Composite.add(engine.world, [ground, leftWall, rightWall, ceiling]);

    // Create pea bodies and assign a random pea image index to each
    const bodies: Matter.Body[] = [];
    const peaIndices: number[] = [];
    const numPeas = PHYSICS_CONFIG.NUM_PEAS;

    // Performance optimization: Only draw peas that are visible
    function isPeaVisible(
      body: Matter.Body,
      canvas: HTMLCanvasElement
    ): boolean {
      const margin = PHYSICS_CONFIG.CULLING_MARGIN;
      return (
        body.position.x >= -margin &&
        body.position.x <= canvas.width + margin &&
        body.position.y >= -margin &&
        body.position.y <= canvas.height + margin
      );
    }

    // Function to create a single pea
    function createPea(index: number) {
      const peaIdx = getRandomPeaIndex();
      const pea = PEA_POOL[peaIdx];
      if (!pea) return; // Skip if pea is undefined

      // Random size variation between 1.5x and 3.5x smaller
      const sizeScale =
        Math.random() *
          (PHYSICS_CONFIG.SIZE_SCALE_MAX - PHYSICS_CONFIG.SIZE_SCALE_MIN) +
        PHYSICS_CONFIG.SIZE_SCALE_MIN;
      const radius = Math.max(pea.rx, pea.ry) / sizeScale;

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

      // Give peas initial velocity for natural falling
      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * PHYSICS_CONFIG.INITIAL_VELOCITY_X_RANGE,
        y: PHYSICS_CONFIG.INITIAL_VELOCITY_Y,
      });
      (body as any).peaIdx = peaIdx;
      (body as any).sizeScale = sizeScale; // Store the scale for drawing
      bodies.push(body);
      peaIndices.push(peaIdx);
      bodiesRef.current.push(body);
      Matter.Composite.add(engine.world, body);

      // Schedule next pea if there are more to create
      if (index + 1 < numPeas) {
        const randomDelay =
          Math.random() *
            (PHYSICS_CONFIG.DROP_INTERVAL_MAX -
              PHYSICS_CONFIG.DROP_INTERVAL_MIN) +
          PHYSICS_CONFIG.DROP_INTERVAL_MIN;
        const timeout = setTimeout(() => createPea(index + 1), randomDelay);
        timeoutsRef.current.push(timeout);
      }
    }

    // Start creating peas one by one
    createPea(0);

    // Start the engine
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    // Animation loop
    let running = true;
    function draw() {
      if (!running) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      function drawPeaIfDefined(
        ctx: CanvasRenderingContext2D,
        body: Matter.Body
      ) {
        const peaIdx = (body as any).peaIdx as number;
        const sizeScale = (body as any).sizeScale as number;
        if (typeof peaIdx !== "number" || typeof sizeScale !== "number") return;
        const pea = PEA_POOL[peaIdx];
        const img = PEA_IMAGES[peaIdx];
        if (!pea || !img) return; // Check both are defined
        const { rx, ry } = pea;
        const width = (rx * 2 + 20) / sizeScale; // Use individual scale
        const height = (ry * 2 + 20) / sizeScale; // Use individual scale
        ctx.save();
        ctx.translate(
          body.position.x - width / 2,
          body.position.y - height / 2
        );
        ctx.rotate(body.angle);
        ctx.drawImage(img, 0, 0, width, height);
        ctx.restore();
      }
      for (let i = 0; i < bodiesRef.current.length; i++) {
        const body = bodiesRef.current[i];
        if (!body) continue;

        // Only draw peas that are visible (culling for performance)
        if (!isPeaVisible(body, canvas)) continue;

        drawPeaIfDefined(ctx, body);
      }
      // Reduce logging frequency for performance
      if (bodiesRef.current.length > 0 && Math.random() < 0.01) {
        // Only log 1% of frames
      }
      requestAnimationFrame(draw);
    }
    draw();

    // Cleanup
    return () => {
      running = false;
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);

      // Clear all timeouts
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current = [];

      // Clear all bodies
      bodiesRef.current.forEach((body) => {
        if (!body) return;
        Matter.Composite.remove(engine.world, body);
      });
      bodiesRef.current = [];
      peaIndicesRef.current = [];

      // Reset initialization flag
      isInitializedRef.current = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current || !engineRef.current)
        return;
      const container = containerRef.current;
      const canvas = canvasRef.current;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      // Reposition containment walls for new canvas size
      const world = engineRef.current.world;
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
              Matter.Bodies.rectangle(
                -50,
                canvas.height / 2,
                100,
                canvas.height
              ).vertices
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
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      ref={(el) => {
        containerRef.current = el;
      }}
      className="relative w-full h-full"
    >
      {/* Physics canvas background */}
      <canvas
        ref={(el) => {
          canvasRef.current = el;
        }}
        className={`absolute inset-0 w-full h-full ${className}`}
        style={{ zIndex: 0, display: "block" }}
      />
      {/* Content overlay */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
