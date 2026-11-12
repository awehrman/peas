import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadGoldenCases } from "../../v3/__tests__/helpers/golden.js";

// Plain Node loads the ~11 MB generated v1 parser far faster than Vite can
// transform it, so v1 runs in a child process.
const v1ParserUrl = new URL("../../../dist/v1/parser.js", import.meta.url).href;
const RUN_V1 = `
import { readFileSync } from "node:fs";
const { parse } = await import(process.argv[1]);
const inputs = JSON.parse(readFileSync(0, "utf8"));
const results = {};
for (const input of inputs) {
  try {
    results[input] = parse(input).values.map((s) => s.type + ":" + String(s.value)).join(" | ");
  } catch (error) {
    results[input] = "ERROR " + String(error.message).slice(0, 80);
  }
}
process.stdout.write(JSON.stringify(results));
`;

/**
 * Records how v1 parses the structural dev set so its behavior is measurable
 * while v3 replaces it. This is a reference, not ground truth.
 */
describe("v1 baseline on the structural dev set", () => {
  it("matches the recorded snapshot", () => {
    const inputs = loadGoldenCases("structural.dev").map(({ input }) => input);
    const output = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", RUN_V1, fileURLToPath(v1ParserUrl)],
      { input: JSON.stringify(inputs), encoding: "utf8" }
    );

    expect(JSON.parse(output)).toMatchSnapshot();
    // v1 averages ~70 ms per line
  }, 60_000);
});
