"use client";

import type { ReactNode } from "react";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@peas/components";
import { GripVertical } from "lucide-react";

import type { GrammarRuleView } from "../types";

interface ReorderRuleListProps {
  rules: GrammarRuleView[];
  onReorder: (rules: GrammarRuleView[]) => void;
}

/**
 * Compact drag-and-drop list for reordering rules. Works with the mouse or,
 * from a grip button, Space to pick up, arrow keys to move and Space to drop.
 */
export function ReorderRuleList({ rules, onReorder }: ReorderRuleListProps): ReactNode {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const nameById = new Map(rules.map((rule) => [rule.id, rule.name]));
  const describe = (id: string | number) => nameById.get(String(id)) ?? "rule";
  const positionOf = (id: string | number) => rules.findIndex((rule) => rule.id === id) + 1;

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = rules.findIndex((rule) => rule.id === active.id);
    const to = rules.findIndex((rule) => rule.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(rules, from, to));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${describe(active.id)}.`,
          onDragOver: ({ active, over }) =>
            over ? `${describe(active.id)} is over position ${positionOf(over.id)}.` : undefined,
          onDragEnd: ({ active, over }) =>
            over
              ? `${describe(active.id)} dropped at position ${positionOf(over.id)}.`
              : `${describe(active.id)} dropped.`,
          onDragCancel: ({ active }) => `Moving ${describe(active.id)} was cancelled.`,
        },
      }}
    >
      <SortableContext items={rules.map((rule) => rule.id)} strategy={verticalListSortingStrategy}>
        <ol className="flex flex-col gap-2" aria-label="Rule order">
          {rules.map((rule, index) => (
            <SortableRuleRow key={rule.id} rule={rule} position={index + 1} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableRuleRow({ rule, position }: { rule: GrammarRuleView; position: number }): ReactNode {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: rule.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card px-3 py-2",
        isDragging && "relative z-10 shadow-lg"
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="cursor-grab rounded p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Move ${rule.name}, currently at position ${position}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="w-6 text-right text-xs text-greyscale-500">{position}</span>
      <span className="font-mono font-semibold">{rule.name}</span>
      <span className="text-sm text-greyscale-600">{rule.label}</span>
    </li>
  );
}
