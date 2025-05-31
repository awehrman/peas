// scripts/build-styles.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var { colors, typography, spacing, breakpoints, shadows } = await import("@peas/theme");
function toKebabCase(str) {
  return str.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}
var css = `@import "tailwindcss";

`;
css += `
/* ================= Theme Tokens ================= */
@theme {
`;
css += `
  /* Colors */

`;
for (const [colorName, colorValue] of Object.entries(colors)) {
  if (colorValue && typeof colorValue === "object") {
    css += `    /* ${colorName.charAt(0).toUpperCase() + colorName.slice(1)} Colors */
`;
    for (const [shade, value] of Object.entries(colorValue)) {
      if (shade === "DEFAULT" || shade === "foreground") continue;
      css += `    --color-${colorName}-${shade}: ${value};
`;
    }
    if (colorValue && "DEFAULT" in colorValue) {
      css += `    --color-${colorName}: ${colorValue.DEFAULT};
`;
    }
    if (colorValue && "foreground" in colorValue) {
      css += `    --color-${colorName}-foreground: ${colorValue.foreground};
`;
    }
    css += `
`;
  } else if (colorValue != null) {
    css += `    --color-${toKebabCase(colorName)}: ${colorValue};
`;
  }
}
css += `
  /* Typography */

`;
for (const [key, value] of Object.entries(typography)) {
  if (value && typeof value === "object") {
    for (const [subKey, subValue] of Object.entries(value)) {
      if (Array.isArray(subValue)) {
        css += `    --${toKebabCase(key)}-${toKebabCase(subKey)}: ${subValue.join(", ")};
`;
      } else {
        css += `    --${toKebabCase(key)}-${toKebabCase(subKey)}: ${subValue};
`;
      }
    }
    css += `
`;
  } else if (value != null) {
    css += `    --font-${toKebabCase(key)}: ${value};
`;
  }
}
css += `
  /* Spacing */

`;
for (const [key, value] of Object.entries(spacing)) {
  if (value != null) {
    css += `    --spacing-${key}: ${value};
`;
  }
}
css += `
`;
css += `
  /* Breakpoints */

`;
for (const [key, value] of Object.entries(breakpoints)) {
  if (value != null) {
    css += `    --breakpoint-${toKebabCase(key)}: ${value};
`;
  }
}
css += `
`;
css += `
  /* Shadows */

`;
for (const [key, value] of Object.entries(shadows)) {
  if (value != null) {
    css += `    --shadow-${toKebabCase(key)}: ${value};
`;
  }
}
css += `
`;
css += `}

`;
fs.writeFileSync(path.resolve(__dirname, "../shared-styles.css"), css);
console.log("Generated shared-styles.css from theme tokens!");
