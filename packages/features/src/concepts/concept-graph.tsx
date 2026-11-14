"use client";

import { type ReactNode, useId } from "react";

import { Checkbox, Label } from "@peas/components";
import { ArrowLeft } from "lucide-react";

import { AppLink, useAppNavigation } from "../app-navigation";
import { formatCount } from "../dashboard/components/stat-charts";

export const GRAPH_RELATIONSHIP_TYPES = [
  "IS_A",
  "PART_OF",
  "DERIVED_FROM",
  "PROCESSED_FROM",
] as const;
export type GraphRelationshipType = (typeof GRAPH_RELATIONSHIP_TYPES)[number];

const TYPE_LABELS: Record<GraphRelationshipType, string> = {
  IS_A: "is a kind of",
  PART_OF: "is part of",
  DERIVED_FROM: "is made from",
  PROCESSED_FROM: "is processed from",
};

const TYPE_DASHES: Record<GraphRelationshipType, string | undefined> = {
  IS_A: undefined,
  PART_OF: "6 3",
  DERIVED_FROM: "2 3",
  PROCESSED_FROM: "8 3 2 3",
};

export interface ConceptGraphNodeData {
  id: string;
  canonicalName: string;
  status: string;
  level: number;
  directMentions: number;
}

export interface ConceptGraphEdgeData {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  status: string;
  decision: { revision: number; username: string } | null;
}

export interface ConceptGraphData {
  centerId: string;
  nodes: ConceptGraphNodeData[];
  edges: ConceptGraphEdgeData[];
  truncated: boolean;
}

/**
 * What the graph shows, as kept in the URL.
 *
 * @example
 * { depth: 2, types: ["IS_A", "PART_OF"], direction: "BOTH" }
 */
export interface ConceptGraphOptions {
  depth: number;
  types: GraphRelationshipType[];
  direction: "UP" | "DOWN" | "BOTH";
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 34;
const ROW_HEIGHT = 96;
const PADDING = 24;
const MAX_LABELED_EDGES = 30;

interface PlacedNode extends ConceptGraphNodeData {
  x: number;
  y: number;
}

/**
 * Places nodes in rows by level (more general foods on top) and spreads each row evenly.
 *
 * @example
 * layoutGraph(nodes) // { width: 720, height: 240, nodes: [{ id: "...", x: 360, y: 41, ... }] }
 */
export function layoutGraph(nodes: ConceptGraphNodeData[]): {
  width: number;
  height: number;
  nodes: PlacedNode[];
} {
  const rows = new Map<number, ConceptGraphNodeData[]>();
  for (const node of nodes)
    rows.set(node.level, [...(rows.get(node.level) ?? []), node]);
  const levels = [...rows.keys()].sort((a, b) => a - b);
  const widest = Math.max(1, ...[...rows.values()].map((row) => row.length));
  const width = Math.max(720, widest * (NODE_WIDTH + 24) + PADDING * 2);
  const placed = levels.flatMap((level, rowIndex) => {
    const row = (rows.get(level) ?? []).sort((a, b) =>
      a.canonicalName.localeCompare(b.canonicalName)
    );
    const step = (width - PADDING * 2) / row.length;
    return row.map((node, index) => ({
      ...node,
      x: PADDING + step * (index + 0.5),
      y: PADDING + NODE_HEIGHT / 2 + rowIndex * ROW_HEIGHT,
    }));
  });
  return {
    width,
    height:
      PADDING * 2 + NODE_HEIGHT + Math.max(0, levels.length - 1) * ROW_HEIGHT,
    nodes: placed,
  };
}

function truncate(text: string, length = 18): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function describeLevel(level: number): string {
  if (level === 0) return "center";
  const steps = Math.abs(level);
  return `${steps} ${steps === 1 ? "step" : "steps"} ${level < 0 ? "more general" : "more specific"}`;
}

/**
 * A food's relationship neighborhood (Phase 8-E): a layered drawing (more general foods above, more specific below; line style by relationship type, proposed ones faded) and the same content as lists of foods and relationships, each relationship with the decision that added it. Clicking a food, or following its link in the list, recenters the graph on it to show its neighbors. Relationship types, depth, and direction are switches.
 *
 * @example
 * <ConceptGraphView graph={graph} centerName="chicken" options={{ depth: 2, types: ["IS_A", "PART_OF"], direction: "BOTH" }} graphHref={(id) => `/concepts/${id}/graph`} onOptionsChange={setOptions} backHref="/concepts/0193..." />
 */
export function ConceptGraphView({
  graph,
  centerName,
  options,
  onOptionsChange,
  graphHref,
  backHref,
  isUpdating = false,
}: {
  graph: ConceptGraphData;
  centerName: string;
  options: ConceptGraphOptions;
  onOptionsChange: (options: ConceptGraphOptions) => void;
  /** The graph centered on another food, with the same switches. */
  graphHref: (conceptId: string) => string;
  backHref: string;
  isUpdating?: boolean;
}): ReactNode {
  const id = useId();
  const { push } = useAppNavigation();
  const layout = layoutGraph(graph.nodes);
  const byId = new Map(layout.nodes.map((node) => [node.id, node]));
  const name = (conceptId: string) => byId.get(conceptId)?.canonicalName ?? "";
  const showLabels = graph.edges.length <= MAX_LABELED_EDGES;

  const toggleType = (type: GraphRelationshipType, checked: boolean) =>
    onOptionsChange({
      ...options,
      types: checked
        ? GRAPH_RELATIONSHIP_TYPES.filter(
            (item) => item === type || options.types.includes(item)
          )
        : options.types.filter((item) => item !== type),
    });

  return (
    <article className="flex flex-col gap-6">
      <AppLink
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-greyscale-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {centerName}
      </AppLink>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-greyscale-900">
          Relationships around {centerName}
        </h1>
        <p className="text-sm text-greyscale-700" aria-live="polite">
          {isUpdating
            ? "Updating…"
            : `${formatCount(graph.nodes.length)} ${graph.nodes.length === 1 ? "food" : "foods"}, ${formatCount(graph.edges.length)} ${graph.edges.length === 1 ? "relationship" : "relationships"}${graph.truncated ? " (stopped at 150 foods; narrow the switches to see the rest)" : ""}`}
        </p>
      </header>

      <fieldset className="flex flex-wrap items-end gap-4 rounded-md border border-greyscale-200 p-4">
        <legend className="sr-only">What to show</legend>
        {GRAPH_RELATIONSHIP_TYPES.map((type) => (
          <div key={type} className="flex items-center gap-2">
            <Checkbox
              id={`${id}-${type}`}
              checked={options.types.includes(type)}
              onCheckedChange={(checked) => toggleType(type, checked === true)}
            />
            <Label htmlFor={`${id}-${type}`} className="text-sm font-normal">
              {TYPE_LABELS[type].replace(/^is /, "")}
            </Label>
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-depth`} className="text-xs">
            Steps
          </Label>
          <select
            id={`${id}-depth`}
            value={options.depth}
            onChange={(event) =>
              onOptionsChange({ ...options, depth: Number(event.target.value) })
            }
            className="h-9 rounded-md border border-greyscale-300 bg-white px-2 text-sm"
          >
            {[1, 2, 3].map((depth) => (
              <option key={depth} value={depth}>
                {depth}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-direction`} className="text-xs">
            Direction
          </Label>
          <select
            id={`${id}-direction`}
            value={options.direction}
            onChange={(event) =>
              onOptionsChange({
                ...options,
                direction: event.target
                  .value as ConceptGraphOptions["direction"],
              })
            }
            className="h-9 rounded-md border border-greyscale-300 bg-white px-2 text-sm"
          >
            <option value="BOTH">Both ways</option>
            <option value="UP">More general</option>
            <option value="DOWN">More specific</option>
          </select>
        </div>
      </fieldset>

      <div className="overflow-x-auto rounded-md border border-greyscale-200 bg-white">
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          aria-hidden="true"
          className="block"
        >
          <defs>
            <marker
              id={`${id}-arrow`}
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-greyscale-500" />
            </marker>
          </defs>
          {graph.edges.map((edge) => {
            const source = byId.get(edge.sourceId);
            const target = byId.get(edge.targetId);
            if (!source || !target) return null;
            const goesUp = target.y < source.y;
            const y1 =
              source.y +
              (goesUp
                ? -NODE_HEIGHT / 2
                : target.y > source.y
                  ? NODE_HEIGHT / 2
                  : 0);
            const y2 =
              target.y +
              (goesUp
                ? NODE_HEIGHT / 2
                : target.y > source.y
                  ? -NODE_HEIGHT / 2
                  : 0);
            return (
              <g key={edge.id} opacity={edge.status === "ACTIVE" ? 1 : 0.45}>
                <line
                  x1={source.x}
                  y1={y1}
                  x2={target.x}
                  y2={y2}
                  strokeWidth={1.5}
                  strokeDasharray={
                    TYPE_DASHES[edge.type as GraphRelationshipType]
                  }
                  markerEnd={`url(#${id}-arrow)`}
                  className="stroke-greyscale-500"
                />
                {showLabels ? (
                  <text
                    x={(source.x + target.x) / 2}
                    y={(y1 + y2) / 2}
                    textAnchor="middle"
                    className="fill-greyscale-600 text-[10px]"
                  >
                    {(
                      TYPE_LABELS[edge.type as GraphRelationshipType] ??
                      edge.type
                    ).replace(/^is /, "")}
                  </text>
                ) : null}
              </g>
            );
          })}
          {layout.nodes.map((node) => {
            const isCenter = node.id === graph.centerId;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x - NODE_WIDTH / 2} ${node.y - NODE_HEIGHT / 2})`}
                className={isCenter ? undefined : "cursor-pointer"}
                onClick={isCenter ? undefined : () => push(graphHref(node.id))}
              >
                <title>{`${node.canonicalName}: ${node.directMentions} mentions`}</title>
                <rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={8}
                  strokeWidth={isCenter ? 2 : 1}
                  strokeDasharray={
                    node.status === "VERIFIED" ? undefined : "4 3"
                  }
                  className={
                    isCenter
                      ? "fill-primary/15 stroke-primary"
                      : "fill-white stroke-greyscale-400"
                  }
                />
                <text
                  x={NODE_WIDTH / 2}
                  y={NODE_HEIGHT / 2 + 4}
                  textAnchor="middle"
                  className="fill-greyscale-900 text-xs"
                >
                  {truncate(node.canonicalName)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section
          aria-labelledby={`${id}-foods`}
          className="flex flex-col gap-2"
        >
          <h2
            id={`${id}-foods`}
            className="text-lg font-semibold text-greyscale-900"
          >
            Foods
          </h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {layout.nodes.map((node) => (
              <li
                key={node.id}
                className="flex flex-wrap items-baseline gap-x-2"
              >
                {node.id === graph.centerId ? (
                  <span className="font-medium">{node.canonicalName}</span>
                ) : (
                  <AppLink
                    href={graphHref(node.id)}
                    className="text-primary underline underline-offset-2"
                  >
                    {node.canonicalName}
                  </AppLink>
                )}
                <span className="text-xs text-greyscale-600">
                  {describeLevel(node.level)} ·{" "}
                  {formatCount(node.directMentions)}{" "}
                  {node.directMentions === 1 ? "mention" : "mentions"}
                  {node.status === "VERIFIED"
                    ? ""
                    : ` · ${node.status.toLowerCase()}`}
                </span>
                <AppLink
                  href={`/concepts/${node.id}`}
                  className="text-xs text-greyscale-600 underline underline-offset-2"
                >
                  Concept page
                  <span className="sr-only"> for {node.canonicalName}</span>
                </AppLink>
              </li>
            ))}
          </ul>
        </section>
        <section
          aria-labelledby={`${id}-relationships`}
          className="flex flex-col gap-2"
        >
          <h2
            id={`${id}-relationships`}
            className="text-lg font-semibold text-greyscale-900"
          >
            Relationships
          </h2>
          {graph.edges.length === 0 ? (
            <p className="text-sm text-greyscale-600">
              No relationships with these switches.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {graph.edges.map((edge) => (
                <li key={edge.id}>
                  {name(edge.sourceId)}{" "}
                  {TYPE_LABELS[edge.type as GraphRelationshipType] ?? edge.type}{" "}
                  {name(edge.targetId)}
                  <span className="text-xs text-greyscale-600">
                    {edge.status === "ACTIVE"
                      ? ""
                      : ` (${edge.status.toLowerCase()})`}
                    {" · "}
                    {edge.decision
                      ? `added by ${edge.decision.username} in revision ${edge.decision.revision}`
                      : "seeded, no decision"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  );
}
