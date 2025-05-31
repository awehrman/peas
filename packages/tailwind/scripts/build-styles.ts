import { colors } from "@peas/theme";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function toKebabCase(str: string) {
  return str.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

let css = `@import "tailwindcss";\n\n@theme {\n`;

for (const [colorName, colorValue] of Object.entries(colors)) {
  if (typeof colorValue === "object") {
    for (const [shade, value] of Object.entries(colorValue)) {
      if (shade === "DEFAULT" || shade === "foreground") continue;
      css += `  --color-${colorName}-${shade}: ${value};\n`;
    }
    if ("DEFAULT" in colorValue) {
      css += `  --color-${colorName}: ${colorValue.DEFAULT};\n`;
    }
    if ("foreground" in colorValue) {
      css += `  --color-${colorName}-foreground: ${colorValue.foreground};\n`;
    }
  } else {
    css += `  --color-${toKebabCase(colorName)}: ${colorValue};\n`;
  }
}
css += `}\n`;

fs.writeFileSync(path.resolve(__dirname, "../shared-styles.css"), css);

console.log("Generated shared-styles.css from theme colors!");
