import { ensureV1Parser } from "./ensure-v1.js";
import { generateV2Parser } from "./generate-v2.js";

/**
 * Regenerates the v2 grammar so tests never run against a stale parser, and
 * compiles v1 if it is missing so its baseline test runs without a build.
 */
export default function setup() {
  generateV2Parser();
  ensureV1Parser();
}
