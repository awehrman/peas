"use client";

import { useEffect, useRef } from "react";
import * as Matter from "matter-js";
import { PeaGenerator, type PeaConfig } from "@peas/pea-svg-generator";

interface PhysicsBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

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
  console.log("🔧 Initializing pea pool and images...");
  if (PEA_POOL.length === 0) {
    console.log("📦 Creating new pea pool...");
    const generator = new PeaGenerator({
      width: 1000,
      height: 1000,
      peasPerRow: 3,
      margin: 50,
    });
    PEA_POOL = generator.generatePeaConfigs();
    console.log(`📊 Generated ${PEA_POOL.length} pea configs`);
    if (typeof window !== "undefined") {
      console.log("🖼️ Creating pea images...");
      PEA_IMAGES = createPeaImages(PEA_POOL);
      console.log(`🖼️ Created ${PEA_IMAGES.length} pea images`);
      // Log image loading status
      PEA_IMAGES.forEach((img, i) => {
        console.log(
          `🖼️ Image ${i}: width=${img.width}, height=${img.height}, complete=${img.complete}`
        );
      });
    }
  } else {
    console.log(`📦 Using existing pea pool with ${PEA_POOL.length} configs`);
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
  console.log("🚀 PhysicsBackground component mounted!");
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const bodiesRef = useRef<Matter.Body[]>([]);
  const peaIndicesRef = useRef<number[]>([]); // Track which pea image for each body
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]); // Track timeouts for cleanup

  // Log refs on every render
  console.log("📊 Refs status:", {
    containerRef: containerRef.current,
    canvasRef: canvasRef.current,
    containerElement: containerRef.current?.tagName,
    canvasElement: canvasRef.current?.tagName,
  });

  // Setup physics and pea images
  useEffect(() => {
    console.log("🔧 PhysicsBackground useEffect running...");
    if (!containerRef.current || !canvasRef.current) {
      console.log("❌ Container or canvas refs not available");
      return;
    }
    console.log("✅ Container and canvas refs available");
    initializePeaPoolAndImages();

    const container = containerRef.current;
    const canvas = canvasRef.current;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const engine = Matter.Engine.create();
    engineRef.current = engine;

    // Create ground and walls
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
    Matter.Composite.add(engine.world, [ground, leftWall, rightWall]);

    // Create pea bodies and assign a random pea image index to each
    const bodies: Matter.Body[] = [];
    const peaIndices: number[] = [];
    const numPeas = 15;

    // Function to create a single pea
    function createPea(index: number) {
      const peaIdx = getRandomPeaIndex();
      const pea = PEA_POOL[peaIdx];
      if (!pea) return; // Skip if pea is undefined

      // Random size variation between 1.5x and 3.5x smaller
      const sizeScale = Math.random() * 2 + 2; // Random between 1.5 and 3.5
      const radius = Math.max(pea.rx, pea.ry) / sizeScale;

      const body = Matter.Bodies.circle(
        Math.random() * (canvas.width - 100) + 50,
        -50, // Start above the canvas
        radius,
        {
          restitution: 0.8,
          friction: 0.1,
        }
      );
      (body as any).peaIdx = peaIdx;
      (body as any).sizeScale = sizeScale; // Store the scale for drawing
      bodies.push(body);
      peaIndices.push(peaIdx);
      bodiesRef.current.push(body);
      Matter.Composite.add(engine.world, body);
      console.log(
        `🥕 Created pea ${index + 1} with scale ${sizeScale.toFixed(2)}`
      );

      // Schedule next pea if there are more to create
      if (index + 1 < numPeas) {
        const randomDelay = Math.random() * 2000 + 500; // Random delay between 0.5-2.5 seconds
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
        drawPeaIfDefined(ctx, body);
      }
      if (bodiesRef.current.length > 0) {
        console.log(`🎨 Drawing ${bodiesRef.current.length} peas`);
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

      console.log("🧹 PhysicsBackground cleanup completed");
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current || !engineRef.current)
        return;
      const container = containerRef.current;
      const canvas = canvasRef.current;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Remove bodies after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (engineRef.current && bodiesRef.current.length > 0) {
        bodiesRef.current.forEach((body) => {
          if (!body) return;
          Matter.Composite.remove(engineRef.current!.world, body);
        });
        bodiesRef.current = [];
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={(el) => {
        containerRef.current = el;
        console.log("📦 Container ref set:", el);
      }}
      className="relative w-full h-full"
    >
      {/* Physics canvas background */}
      <canvas
        ref={(el) => {
          canvasRef.current = el;
          console.log("🎨 Canvas ref set:", el);
        }}
        className={`absolute inset-0 w-full h-full ${className}`}
        style={{ zIndex: 0, display: "block" }}
      />
      {/* Content overlay */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
