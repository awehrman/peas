"use client";

import { ImportActivityCard } from "./import-activity-card";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@peas/components";
import { VariableSizeList as List } from "react-window";

import { useActivity } from "../context/activity";
import type { ImportCard } from "../types/import-types";

const CARDS_PER_PAGE = 10;
const COLLAPSED_CARD_HEIGHT = 80; // Height for collapsed cards
const EXPANDED_CARD_BASE_HEIGHT = 120; // Base height for expanded card header
const STEP_HEIGHT = 50; // Height per step in expanded view
const CARD_GAP = 12; // Gap between cards
const LIST_MAX_HEIGHT = 800; // Max height for the virtualized list

/**
 * Container component for the virtualized, paginated activity list
 * Displays import cards with real-time status updates
 */
export function ImportActivityList() {
  const { state, dispatch } = useActivity();
  const [currentPage, setCurrentPage] = useState(0);
  const listRef = useRef<List>(null);

  const currentPageCardIds = state.pageToCardIds[currentPage] || [];
  const currentPageCards: ImportCard[] = useMemo(
    () =>
      currentPageCardIds
        .map((id) => state.cardsById[id])
        .filter((card): card is ImportCard => card !== undefined),
    [currentPageCardIds, state.cardsById]
  );

  const totalCards = Object.keys(state.cardsById).length;
  const totalPages = Math.ceil(totalCards / CARDS_PER_PAGE);

  // Calculate height for each card based on expansion state
  const getItemSize = useCallback(
    (index: number): number => {
      const card = currentPageCards[index];
      if (!card) return COLLAPSED_CARD_HEIGHT + CARD_GAP;

      if (card.isExpanded) {
        // Count number of steps to show (10 steps)
        const stepCount = 10;
        return EXPANDED_CARD_BASE_HEIGHT + stepCount * STEP_HEIGHT + CARD_GAP;
      }

      return COLLAPSED_CARD_HEIGHT + CARD_GAP;
    },
    [currentPageCards]
  );

  // Calculate total height for all visible cards
  const totalListHeight = useMemo(() => {
    let height = 0;
    for (let i = 0; i < currentPageCards.length; i++) {
      height += getItemSize(i);
    }
    return Math.min(height, LIST_MAX_HEIGHT);
  }, [currentPageCards.length, getItemSize]);

  const handleToggle = useCallback(
    (cardId: string) => {
      dispatch({
        type: "TOGGLE_CARD_EXPANDED",
        pageIndex: currentPage,
        cardId,
      });

      // Reset item size cache when a card is toggled
      // This forces the list to recalculate heights
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
      }
    },
    [dispatch, currentPage]
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    dispatch({
      type: "SET_PAGE",
      pageIndex: page,
    });
  };

  if (totalCards === 0) {
    return null;
  }

  const Row = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const card = currentPageCards[index];
    if (!card) return null;

    return (
      <div style={style} className="px-4 py-2">
        <ImportActivityCard
          card={card}
          isExpanded={card.isExpanded}
          onToggle={() => handleToggle(card.id)}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Import Activity</h3>

      {/* Virtualized List */}
      <div className="border rounded-lg overflow-hidden bg-gray-50">
        <List
          ref={listRef}
          height={totalListHeight}
          itemCount={currentPageCards.length}
          itemSize={getItemSize}
          width="100%"
        >
          {Row}
        </List>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                  aria-disabled={currentPage === 0}
                  className={
                    currentPage === 0 ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    onClick={() => handlePageChange(i)}
                    isActive={currentPage === i}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    handlePageChange(Math.min(totalPages - 1, currentPage + 1))
                  }
                  aria-disabled={currentPage === totalPages - 1}
                  className={
                    currentPage === totalPages - 1
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
