#!/usr/bin/env tsx
/**
 * Applies a structure pattern to every open proposal it raised (Phase 8.5-E), recorded as the given reviewer's approval, one transaction per line, each undoable on the Structure tab. Refuses unless the pattern's review precision clears 98% over at least 50 decisions; `--list` shows each pattern's numbers.
 *
 * Usage:
 *   yarn workspace @peas/database db:reclassify:structure --list
 *   yarn workspace @peas/database db:reclassify:structure --pattern "SECTION_HEADING:COLON_HEADING" --user <username>
 */
import { parseArgs } from "node:util";

import { prisma } from "../src/client.js";
import {
  decideStructurePattern,
  getStructurePatterns,
} from "../src/repository/structure.js";

const { values } = parseArgs({
  options: {
    list: { type: "boolean", default: false },
    pattern: { type: "string" },
    user: { type: "string" },
  },
});

try {
  if (values.list || !values.pattern) {
    for (const row of await getStructurePatterns())
      console.log(
        `${row.patternKey.padEnd(48)} open ${String(row.open).padStart(5)}  approved ${String(row.approved).padStart(4)}  rejected ${String(row.rejected).padStart(4)}  changed ${String(row.changed).padStart(4)}  precision ${row.precision === null ? "  n/a" : `${(row.precision * 100).toFixed(1)}%`}  ${row.scope}${row.canAutoApply ? "  can apply" : ""}`
      );
  } else {
    if (!values.user)
      throw new Error(
        "--user is required: the reviewer the approvals are recorded for"
      );
    const user = await prisma.user.findUniqueOrThrow({
      where: { username: values.user },
      select: { id: true },
    });
    const result = await decideStructurePattern(
      values.pattern,
      { action: "APPROVE" },
      user.id,
      { requirePrecision: true }
    );
    console.log(
      `Applied ${result.applied}; skipped ${result.skipped} whose line changed since.`
    );
  }
} finally {
  await prisma.$disconnect();
}
