// scripts/build-styles.ts
import { colors } from "@peas/theme";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
function toKebabCase(str) {
  return str.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}
var css = `@import "tailwindcss";

@theme {
`;
for (const [colorName, colorValue] of Object.entries(colors)) {
  if (typeof colorValue === "object") {
    for (const [shade, value] of Object.entries(colorValue)) {
      if (shade === "DEFAULT" || shade === "foreground") continue;
      css += `  --color-${colorName}-${shade}: ${value};
`;
    }
    if ("DEFAULT" in colorValue) {
      css += `  --color-${colorName}: ${colorValue.DEFAULT};
`;
    }
    if ("foreground" in colorValue) {
      css += `  --color-${colorName}-foreground: ${colorValue.foreground};
`;
    }
  } else {
    css += `  --color-${toKebabCase(colorName)}: ${colorValue};
`;
  }
}
css += `}
`;
fs.writeFileSync(path.resolve(__dirname, "../shared-styles.css"), css);
console.log("Generated shared-styles.css from theme colors!");
