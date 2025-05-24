import { execSync } from "node:child_process";
execSync("tailwindcss -i ./src/styles.css -o ./dist/styles.css --minify", {
  stdio: "inherit",
});
