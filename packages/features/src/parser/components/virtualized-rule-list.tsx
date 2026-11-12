"use client";

import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import { VariableSizeList } from "react-window";

import { type MutationResult, useElementSize } from "../../shared";
import type { GrammarRuleView } from "../types";

import { RuleCard, type RuleCardEditState } from "./rule-card";

const ESTIMATED_COLLAPSED_HEIGHT = 56;
const ROW_GAP = 8;

interface VirtualizedRuleListProps {
  rules: GrammarRuleView[];
  ruleNames: ReadonlySet<string>;
  expandedIds: ReadonlySet<string>;
  editingId: string | null;
  edit: RuleCardEditState | null;
  onToggle: (id: string) => void;
  onEdit: (rule: GrammarRuleView) => void;
  onDelete: (id: string) => Promise<MutationResult<unknown>>;
}

interface RowData extends Omit<VirtualizedRuleListProps, "editingId"> {
  editingId: string | null;
  setRowHeight: (index: number, id: string, height: number) => void;
}

/**
 * Windowed rule list. Rows measure themselves so expanded rules and the
 * inline editor can be any height.
 */
export function VirtualizedRuleList(props: VirtualizedRuleListProps): ReactNode {
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const listRef = useRef<VariableSizeList<RowData>>(null);
  const heights = useRef(new Map<string, number>());
  const { rules } = props;

  const setRowHeight = useCallback((index: number, id: string, height: number) => {
    if (heights.current.get(id) === height) return;
    heights.current.set(id, height);
    listRef.current?.resetAfterIndex(index);
  }, []);

  const getItemSize = useCallback(
    (index: number) => {
      const rule = rules[index];
      return (rule && heights.current.get(rule.id)) ?? ESTIMATED_COLLAPSED_HEIGHT + ROW_GAP;
    },
    [rules]
  );

  useLayoutEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [rules]);

  const itemData = useMemo<RowData>(() => ({ ...props, setRowHeight }), [props, setRowHeight]);

  return (
    <div ref={containerRef} className="h-[calc(100vh-20rem)] min-h-[24rem]" role="list" aria-label="Grammar rules">
      {size.height > 0 ? (
        <VariableSizeList<RowData>
          ref={listRef}
          height={size.height}
          width="100%"
          itemCount={rules.length}
          itemSize={getItemSize}
          estimatedItemSize={ESTIMATED_COLLAPSED_HEIGHT + ROW_GAP}
          itemData={itemData}
          itemKey={(index, data) => data.rules[index]?.id ?? index}
          overscanCount={4}
        >
          {MeasuredRuleRow}
        </VariableSizeList>
      ) : null}
    </div>
  );
}

function MeasuredRuleRow({
  index,
  style,
  data,
}: {
  index: number;
  style: CSSProperties;
  data: RowData;
}): ReactNode {
  const contentRef = useRef<HTMLDivElement>(null);
  const rule = data.rules[index];
  const { setRowHeight } = data;
  const ruleId = rule?.id;

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element || !ruleId) return;

    const measure = () => setRowHeight(index, ruleId, element.getBoundingClientRect().height + ROW_GAP);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [index, ruleId, setRowHeight]);

  if (!rule) return null;
  const isEditing = data.editingId === rule.id;

  return (
    <div style={style} role="listitem">
      <div ref={contentRef}>
        <RuleCard
          rule={rule}
          ruleNames={data.ruleNames}
          isExpanded={data.expandedIds.has(rule.id)}
          onToggle={data.onToggle}
          onEdit={data.onEdit}
          onDelete={data.onDelete}
          edit={isEditing ? data.edit : null}
        />
      </div>
    </div>
  );
}
