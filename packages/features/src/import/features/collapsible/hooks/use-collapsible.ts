import { useCallback, useEffect, useRef, useReducer } from "react";

import { UseCollapsibleOptions, UseCollapsibleReturn, CollapsibleState } from "../types/collapsible";
import { collapsibleReducer } from "../reducers/collapsible-reducer";

const initialState: CollapsibleState = {
  isExpanded: false,
  isAnimating: false,
  contentHeight: 0,
  transitionDuration: 300,
};

export function useCollapsible(options: UseCollapsibleOptions = {}): UseCollapsibleReturn {
  const {
    defaultExpanded = false,
    transitionDuration = 300,
    onToggle,
  } = options;

  const contentRef = useRef<HTMLDivElement>(null);
  // const animationRef = useRef<number | undefined>(undefined);

  const [state, dispatch] = useReducer(collapsibleReducer, {
    ...initialState,
    isExpanded: defaultExpanded,
    transitionDuration,
  });

  const toggle = useCallback(() => {
    dispatch({ type: "TOGGLE" });
    onToggle?.(!state.isExpanded);
  }, [state.isExpanded, onToggle]);

  const expand = useCallback(() => {
    dispatch({ type: "EXPAND" });
    onToggle?.(true);
  }, [onToggle]);

  const collapse = useCallback(() => {
    dispatch({ type: "COLLAPSE" });
    onToggle?.(false);
  }, [onToggle]);

  const setExpanded = useCallback((expanded: boolean) => {
    dispatch({ type: "SET_EXPANDED", payload: expanded });
    onToggle?.(expanded);
  }, [onToggle]);

  // Measure content height when expanded state changes
  useEffect(() => {
    if (contentRef.current) {
      const measureHeight = () => {
        if (contentRef.current) {
          const height = contentRef.current.scrollHeight;
          dispatch({ type: "SET_CONTENT_HEIGHT", payload: height });
        }
      };

      // Measure immediately
      measureHeight();

      // Set up resize observer for dynamic content
      const resizeObserver = new ResizeObserver(measureHeight);
      resizeObserver.observe(contentRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [state.isExpanded]);

  // Handle animation timing
  useEffect(() => {
    if (state.isAnimating) {
      const timer = setTimeout(() => {
        dispatch({ type: "SET_ANIMATING", payload: false });
      }, state.transitionDuration);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [state.isAnimating, state.transitionDuration]);

  return {
    ...state,
    toggle,
    expand,
    collapse,
    setExpanded,
  };
}
