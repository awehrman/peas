"use client";

import { useRef, useEffect, useState } from "react";
import { CollapsibleContentProps } from "../types/collapsible";

export function CollapsibleContent({
  children,
  isExpanded,
  className = "",
  transitionDuration = 300,
}: CollapsibleContentProps): React.ReactElement {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);
  // const [_isAnimating, setIsAnimating] = useState(false);

  // Measure content height
  useEffect(() => {
    if (contentRef.current) {
      const measureHeight = () => {
        if (contentRef.current) {
          const height = contentRef.current.scrollHeight;
          setContentHeight(height);
        }
      };

      measureHeight();

      // Set up resize observer for dynamic content
      const resizeObserver = new ResizeObserver(measureHeight);
      resizeObserver.observe(contentRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [children]);

  // Handle animation
  useEffect(() => {
    if (isExpanded) {
      // setIsAnimating(true);
      const timer = setTimeout(() => {
        // setIsAnimating(false);
      }, transitionDuration);

      return () => {
        clearTimeout(timer);
      };
    } else {
      // setIsAnimating(true);
      const timer = setTimeout(() => {
        // setIsAnimating(false);
      }, transitionDuration);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isExpanded, transitionDuration]);

  const containerStyle = {
    height: isExpanded ? contentHeight : 0,
    overflow: isExpanded ? 'visible' : 'hidden',
    transition: `height ${transitionDuration}ms ease-in-out`,
  };

  return (
    <div
      className={`collapsible-content overflow-hidden ${className}`}
      style={containerStyle}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
}
