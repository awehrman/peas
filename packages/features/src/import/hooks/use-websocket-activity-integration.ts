"use client";

import { useCallback, useEffect, useRef } from "react";

import { useActivity } from "../context/activity";
import type { StatusEvent } from "../types/import-types";
import { createInitialCard, mapContextToStep } from "../utils/activity-helpers";

/**
 * Hook to integrate WebSocket status updates with activity context
 * This creates and updates import cards based on real-time processing events
 */
export function useWebSocketActivityIntegration() {
  const { state, dispatch } = useActivity();

  // Track which importIds we've seen to know when to create new cards
  const seenImportIds = useRef<Set<string>>(new Set());

  // Use refs to avoid recreating callback when state changes
  const stateRef = useRef(state);

  // Keep ref in sync with current state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handleActivityStatusUpdate = useCallback(
    (statusEvent: StatusEvent) => {
      const currentState = stateRef.current;
      const {
        importId,
        noteId,
        status,
        context,
        message,
        currentCount,
        totalCount,
        metadata,
      } = statusEvent;

      // Get the current page index (always add to current page)
      const pageIndex = currentState.currentPageIndex;

      // Determine the card ID (prefer noteId, fallback to importId)
      const cardId = noteId || importId;

      // Check if this card already exists in state
      const cardExists = !!currentState.cardsById[cardId];
      const isNewImport = !seenImportIds.current.has(importId) && !cardExists;

      if (isNewImport) {
        // Create a new card for this import
        const newCard = createInitialCard(importId, noteId);

        // Mark first card as expanded
        const isFirstCard = Object.keys(currentState.cardsById).length === 0;
        if (isFirstCard) {
          newCard.isExpanded = true;
        }

        // Extract note title from metadata if available
        if (metadata && typeof metadata.title === "string") {
          newCard.imageThumbnail = metadata.title;
        }

        dispatch({
          type: "ADD_IMPORT_CARD",
          pageIndex,
          card: newCard,
        });

        seenImportIds.current.add(importId);
      } else if (metadata && typeof metadata.title === "string") {
        // Update note title if card already exists and we have a title
        const existingCard = currentState.cardsById[cardId];
        if (existingCard && existingCard.imageThumbnail !== metadata.title) {
          dispatch({
            type: "UPDATE_CARD_TITLE",
            cardId,
            title: metadata.title,
          });
        }
      }

      // Map context to a step in the card
      const step = context ? mapContextToStep(context) : null;

      if (!step) {
        // If we can't map the context, skip the status update (but we may have updated the title above)
        return;
      }

      // Determine the status update based on the event
      let statusUpdate: Record<string, unknown> = {};

      if (status === "PROCESSING") {
        // Step is in progress
        statusUpdate = {
          started: true,
          completed: false,
          hasError: false,
          progressMessage: message,
        };

        // Add progress counts if available
        if (currentCount !== undefined && totalCount !== undefined) {
          statusUpdate.processedSteps = currentCount;
          statusUpdate.steps = totalCount;
        }
      } else if (status === "COMPLETED") {
        // Step is completed
        statusUpdate = {
          started: true,
          completed: true,
          hasError: false,
          completedMessage: message,
        };

        // If we have counts, mark them as complete
        if (totalCount !== undefined) {
          statusUpdate.processedSteps = totalCount;
          statusUpdate.steps = totalCount;
        }
      } else if (status === "FAILED") {
        // Step has failed
        statusUpdate = {
          started: true,
          completed: false,
          hasError: true,
          errorMessage: message || "Processing failed",
        };
      } else if (status === "PENDING") {
        // Step is pending/starting
        statusUpdate = {
          started: true,
          completed: false,
          hasError: false,
          startMessage: message,
        };
      } else {
        // Unknown status, skip update
        return;
      }

      // Dispatch the status update
      dispatch({
        type: "UPDATE_CARD_STATUS",
        pageIndex,
        cardId,
        step,
        statusUpdate,
      });
    },
    [dispatch] // Only dispatch, state is accessed via ref to avoid recreating callback
  );

  return { handleActivityStatusUpdate };
}
