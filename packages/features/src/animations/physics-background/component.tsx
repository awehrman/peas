"use client";

import { PhysicsEngine, PhysicsRenderer, peaManager } from "./index.js";

import { useEffect, useRef } from "react";

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
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Initialize pea manager
    peaManager.initialize();

    // Initialize physics engine
    const physicsEngine = new PhysicsEngine();
    physicsEngine.initialize(canvas, width, height);
    physicsEngineRef.current = physicsEngine;

    // Initialize renderer
    const renderer = new PhysicsRenderer(canvas);
    renderer.resize(width, height);
    rendererRef.current = renderer;

    physicsEngine.start();
    physicsEngine.startPeaCreation();

    // Animation loop; ends once the viewport is full and every pea is at rest
    let running = true;
    function animate() {
      if (!running) return;

      renderer.drawPeas(physicsEngine.getBodies());

      if (physicsEngine.isSettled()) {
        physicsEngine.freeze();
        return;
      }

      window.requestAnimationFrame(animate);
    }
    animate();

    // Cleanup
    return () => {
      running = false;
      physicsEngine.stop();

      // Reset initialization flag
      isInitializedRef.current = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (
        !containerRef.current ||
        !physicsEngineRef.current ||
        !rendererRef.current
      ) {
        return;
      }

      const { clientWidth, clientHeight } = containerRef.current;
      rendererRef.current.resize(clientWidth, clientHeight);
      physicsEngineRef.current.resize(clientWidth, clientHeight);
      // Resizing clears the canvas, and a frozen scene has no loop to redraw it
      rendererRef.current.drawPeas(physicsEngineRef.current.getBodies());
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
