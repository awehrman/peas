"use client";

import { useCallback, useEffect, useRef } from "react";

import { useActivity } from "../context/activity";
import type {
  ImportCard,
  ImportCardDetails,
  StatusEvent,
  StepStatus,
} from "../types/import-types";
import {
  createInitialCard,
  getCardDetailsFromEvent,
  mapContextToStep,
} from "../utils/activity-helpers";

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
      const { importId, noteId, status, context, message, currentCount, totalCount } =
        statusEvent;

      // Early events (cleaning, parsing) arrive before the note has an id,
      // so cards are keyed by importId and pick up the noteId later
      const cardId = importId;

      // State is applied once per frame, so a card queued moments ago may not
      // be in currentState yet; seenImportIds covers that gap
      const knownCard = stateRef.current.cardsById[cardId];
      const isNewImport = !seenImportIds.current.has(importId) && !knownCard;
      const details = getCardDetailsFromEvent(statusEvent);

      if (isNewImport) {
        dispatch({
          type: "ADD_IMPORT_CARD",
          card: { ...createInitialCard(importId, noteId), ...details },
        });
        seenImportIds.current.add(importId);
      } else {
        const changedDetails = getChangedDetails(knownCard, details);
        if (changedDetails) {
          dispatch({ type: "UPDATE_CARD_DETAILS", cardId, details: changedDetails });
        }
      }

      const step = context ? mapContextToStep(context) : null;
      if (!step) return;

      const statusUpdate = getStepStatusUpdate(status, message, currentCount, totalCount);
      if (!statusUpdate) return;

      dispatch({
        type: "UPDATE_CARD_STATUS",
        cardId,
        step,
        statusUpdate,
        noteId,
      });
    },
    [dispatch] // Only dispatch, state is accessed via ref to avoid recreating callback
  );

  return { handleActivityStatusUpdate };
}

/** Details that differ from the card, or null when there is nothing to update. */
function getChangedDetails(
  card: ImportCard | undefined,
  details: ImportCardDetails
): ImportCardDetails | null {
  const entries = Object.entries(details) as [
    keyof ImportCardDetails,
    ImportCardDetails[keyof ImportCardDetails],
  ][];
  const changed = entries.filter(([key, value]) => card?.[key] !== value);
  return changed.length > 0 ? Object.fromEntries(changed) : null;
}

function getStepStatusUpdate(
  status: string,
  message: string | undefined,
  currentCount: number | undefined,
  totalCount: number | undefined
): Partial<StepStatus> | null {
  switch (status) {
    case "PROCESSING":
      return {
        started: true,
        completed: false,
        hasError: false,
        progressMessage: message,
        ...(currentCount !== undefined && totalCount !== undefined
          ? { processedSteps: currentCount, steps: totalCount }
          : {}),
      };
    case "COMPLETED":
      return {
        started: true,
        completed: true,
        hasError: false,
        completedMessage: message,
        ...(totalCount !== undefined
          ? { processedSteps: totalCount, steps: totalCount }
          : {}),
      };
    case "FAILED":
      return {
        started: true,
        completed: false,
        hasError: true,
        errorMessage: message || "Processing failed",
      };
    case "PENDING":
      return {
        started: true,
        completed: false,
        hasError: false,
        startMessage: message,
      };
    default:
      return null;
  }
}
