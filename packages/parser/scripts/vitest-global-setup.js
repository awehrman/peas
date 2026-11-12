import { ensureV1Parser } from "./ensure-v1.js";
import { generateV3Parser } from "./generate-v3.js";

/**
 * Regenerates the v3 grammar so tests never run against a stale parser, and
 * compiles v1 if it is missing so its baseline test runs without a build.
 */
export default function setup() {
  generateV3Parser();
  ensureV1Parser();
}
