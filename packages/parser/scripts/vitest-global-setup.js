import { generateV2Parser } from "./generate-v2.js";

/** Regenerates the v2 grammar so tests never run against a stale parser. */
export default function setup() {
  generateV2Parser();
}
