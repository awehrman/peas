export * from "./types.js";
export * from "./colors.js";
export * from "./generator.js";

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  import("./cli.js");
} 