"use client";

import { ImportActivityCard } from "./import-activity-card";

import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@peas/components";
import { VariableSizeList as List, areEqual } from "react-window";

import { CARDS_PER_PAGE } from "../constants/activity-constants";
import { useActivity } from "../context/activity";
import type { ImportCard } from "../types/import-types";
import { getPageWindow } from "../utils/page-window";

const COLLAPSED_CARD_HEIGHT = 80; // Height for collapsed cards
const EXPANDED_CARD_BASE_HEIGHT = 152; // Expanded card header plus the "View note" link
const STEP_HEIGHT = 50; // Height per step in expanded view
const EXPANDED_STEP_COUNT = 10;
const CARD_GAP = 12; // Gap between cards
const LIST_MAX_HEIGHT = 800; // Max height for the virtualized list
interface RowData {
  cards: ImportCard[];
  onToggle: (cardId: string) => void;
}

/**
 * Container component for the virtualized, paginated activity list
 * Displays import cards with real-time status updates
 */
export function ImportActivityList() {
  const { state, dispatch } = useActivity();
  const listRef = useRef<List<RowData>>(null);

  const totalCards = Object.keys(state.cardsById).length;
  const totalPages = Math.ceil(totalCards / CARDS_PER_PAGE);
  const currentPage = Math.min(state.currentPageIndex, Math.max(0, totalPages - 1));

  const currentPageCardIds = state.pageToCardIds[currentPage];
  const currentPageCards = useMemo(
    () =>
      (currentPageCardIds ?? [])
        .map((id) => state.cardsById[id])
        .filter((card): card is ImportCard => card !== undefined),
    [currentPageCardIds, state.cardsById]
  );

  const getItemSize = useCallback(
    (index: number) => getCardHeight(currentPageCards[index]),
    [currentPageCards]
  );

  const totalListHeight = useMemo(() => {
    const height = currentPageCards.reduce((sum, card) => sum + getCardHeight(card), 0);
    return Math.min(height, LIST_MAX_HEIGHT);
  }, [currentPageCards]);

  // Heights change when a card expands or the page changes, so drop cached sizes
  const expansionKey = currentPageCards.map((card) => (card.isExpanded ? 1 : 0)).join("");
  useLayoutEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [expansionKey, currentPage]);

  const handleToggle = useCallback(
    (cardId: string) => {
      dispatch({ type: "TOGGLE_CARD_EXPANDED", pageIndex: currentPage, cardId });
    },
    [dispatch, currentPage]
  );

  const itemData = useMemo<RowData>(
    () => ({ cards: currentPageCards, onToggle: handleToggle }),
    [currentPageCards, handleToggle]
  );

  if (totalCards === 0) {
    return null;
  }

  const goToPage = (page: number) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    dispatch({ type: "SET_PAGE", pageIndex: page });
  };

  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;

  return (
    <section
      aria-labelledby="import-activity-heading"
      className="bg-card space-y-4 rounded-lg border p-5 shadow-xs"
    >
      <h2 id="import-activity-heading" className="text-base font-semibold">
        Import activity
      </h2>

      {/* Virtualized List */}
      <div className="border rounded-lg overflow-hidden bg-gray-50">
        <List<RowData>
          ref={listRef}
          height={totalListHeight}
          itemCount={currentPageCards.length}
          itemSize={getItemSize}
          itemData={itemData}
          itemKey={(index, data) => data.cards[index]?.id ?? index}
          width="100%"
        >
          {ActivityRow}
        </List>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={goToPage(Math.max(0, currentPage - 1))}
                  aria-disabled={isFirstPage}
                  tabIndex={isFirstPage ? -1 : undefined}
                  className={isFirstPage ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {getPageWindow(currentPage, totalPages).map((item) => (
                <PaginationItem key={item}>
                  {typeof item === "number" ? (
                    <PaginationLink
                      href="#"
                      onClick={goToPage(item)}
                      isActive={currentPage === item}
                      aria-label={`Page ${item + 1}`}
                    >
                      {item + 1}
                    </PaginationLink>
                  ) : (
                    <PaginationEllipsis />
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={goToPage(Math.min(totalPages - 1, currentPage + 1))}
                  aria-disabled={isLastPage}
                  tabIndex={isLastPage ? -1 : undefined}
                  className={isLastPage ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </section>
  );
}

const ActivityRow = memo(function ActivityRow({
  index,
  style,
  data,
}: {
  index: number;
  style: CSSProperties;
  data: RowData;
}): ReactNode {
  const card = data.cards[index];
  if (!card) return null;

  return (
    <div style={style} className="px-4 py-2">
      <ImportActivityCard card={card} isExpanded={card.isExpanded} onToggle={data.onToggle} />
    </div>
  );
}, areEqual);

function getCardHeight(card: ImportCard | undefined): number {
  if (card?.isExpanded) {
    return EXPANDED_CARD_BASE_HEIGHT + EXPANDED_STEP_COUNT * STEP_HEIGHT + CARD_GAP;
  }
  return COLLAPSED_CARD_HEIGHT + CARD_GAP;
}