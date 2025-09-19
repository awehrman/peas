"use client";

import { PhysicsEngine, PhysicsRenderer, peaManager } from "./index.js";

import { useEffect, useRef } from "react";

import Matter from "matter-js";

interface PhysicsBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function PhysicsBackground({
  children,
  className = "",
}: PhysicsBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const physicsEngineRef = useRef<PhysicsEngine | null>(null);
  const rendererRef = useRef<PhysicsRenderer | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const isInitializedRef = useRef(false);

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

    const container = containerRef.current;
    const canvas = canvasRef.current;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Initialize pea manager
    peaManager.initialize();

    // Initialize physics engine
    const physicsEngine = new PhysicsEngine();
    physicsEngine.initialize(canvas);
    physicsEngineRef.current = physicsEngine;

    // Initialize renderer
    const renderer = new PhysicsRenderer(canvas);
    rendererRef.current = renderer;

    // Start physics engine
    const runner = physicsEngine.start();
    runnerRef.current = runner;

    // Start pea creation
    physicsEngine.startPeaCreation(canvas);

    // Animation loop
    let running = true;
    function animate() {
      if (!running) return;

      const bodies = physicsEngine.getBodies();
      renderer.drawPeas(bodies);

      window.requestAnimationFrame(animate);
    }
    animate();

    // Cleanup
    return () => {
      running = false;

      if (runnerRef.current) {
        physicsEngine.stop(runnerRef.current);
      }

      if (rendererRef.current) {
        rendererRef.current.stop();
      }

      // Reset initialization flag
      isInitializedRef.current = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (
        !containerRef.current ||
        !canvasRef.current ||
        !physicsEngineRef.current ||
        !rendererRef.current
      ) {
        return;
      }

      const container = containerRef.current;
      const canvas = canvasRef.current;

      // Update canvas size
      rendererRef.current.updateCanvasSize(
        container.clientWidth,
        container.clientHeight
      );

      // Update physics containment walls
      physicsEngineRef.current.updateContainmentWalls(canvas);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Physics canvas background */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full ${className}`}
        style={{ zIndex: 0, display: "block" }}
      />
      {/* Content overlay */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
