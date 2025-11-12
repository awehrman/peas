import { watch, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distDir = join(__dirname, "../dist");

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

console.log("Watching for changes in dist directory...");

// Run fix-imports initially
exec("node scripts/fix-imports.js", (error, stdout, stderr) => {
  if (error) {
    console.error("Error running fix-imports:", error);
    return;
  }
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
});

const startWatching = () => {
  try {
    watch(distDir, { recursive: true }, (eventType, filename) => {
      if (
        filename &&
        (filename.endsWith(".js") || filename.endsWith(".d.ts"))
      ) {
        console.log(`File ${filename} changed, running fix-imports...`);

        exec("node scripts/fix-imports.js", (error, stdout, stderr) => {
          if (error) {
            console.error("Error running fix-imports:", error);
            return;
          }
          if (stdout) console.log(stdout);
          if (stderr) console.error(stderr);
        });
      }
    });
  } catch (error) {
    console.error("Failed to watch dist directory:", error);
    setTimeout(startWatching, 1000);
  }
};

startWatching();
