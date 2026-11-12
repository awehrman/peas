import type { NormalizedParseResult, NormalizedSegment } from "./types.js";

type Primitive = string | number | boolean;

interface ParserNode {
  rule?: unknown;
  type?: unknown;
  value?: unknown;
  values?: unknown;
}

function isPrimitive(value: unknown): value is Primitive {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isNode(value: unknown): value is ParserNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function joinRule(parent: string, child: string): string {
  if (!parent) return child;
  if (!child) return parent;
  return `${parent} >> ${child}`;
}

function collect(value: unknown, parentRule: string, out: NormalizedSegment[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, parentRule, out);
    return;
  }

  if (!isNode(value)) return;

  const rule = joinRule(parentRule, typeof value.rule === "string" ? value.rule : "");
  const type = typeof value.type === "string" ? value.type : "";

  if (isPrimitive(value.value)) {
    out.push({ rule, type, value: String(value.value) });
    return;
  }

  if (Array.isArray(value.values)) {
    const primitives = value.values.filter(isPrimitive);
    const nested = value.values.filter((item) => !isPrimitive(item));

    if (primitives.length > 0 && type) {
      out.push({ rule, type, value: primitives.map(String).join(" ") });
    }
    for (const item of nested) collect(item, rule, out);
  }
}

/**
 * Flattens any parser output into `{ rule, type, values: segment[] }`.
 *
 * The static v1 grammar already returns flat `{ rule, type, value }`
 * segments. Database grammars return nested `{ rule, type, values }` nodes;
 * a node becomes a segment when its `values` contains plain strings or
 * numbers, and nested nodes are walked with their rule paths joined by ` >> `.
 */
export function normalizeParseResult(raw: unknown): NormalizedParseResult {
  if (!isNode(raw)) {
    const values: NormalizedSegment[] = [];
    collect(raw, "", values);
    return { rule: "", type: "", values };
  }

  const rule = typeof raw.rule === "string" ? raw.rule : "";
  const type = typeof raw.type === "string" ? raw.type : "";
  const values: NormalizedSegment[] = [];

  if (isPrimitive(raw.value)) {
    values.push({ rule, type, value: String(raw.value) });
  } else if (Array.isArray(raw.values)) {
    for (const item of raw.values) {
      if (isPrimitive(item)) {
        if (type) values.push({ rule, type, value: String(item) });
      } else {
        collect(item, isV1Segment(item) ? "" : rule, values);
      }
    }
  }

  return { rule, type, values };
}

/** v1 segments already carry their full rule path. */
function isV1Segment(value: unknown): boolean {
  return isNode(value) && isPrimitive(value.value) && typeof value.rule === "string";
}
