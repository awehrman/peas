import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { colors, typography, spacing, breakpoints, shadows } = await import(
  "@peas/theme"
);

function toKebabCase(str: string) {
  return str.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

let css = `@import "tailwindcss";\n\n`;

// Start @theme block
css += `\n/* ================= Theme Tokens ================= */\n@theme {\n`;

// Colors
css += `\n  /* Colors */\n\n`;
for (const [colorName, colorValue] of Object.entries(colors)) {
  if (colorValue && typeof colorValue === "object") {
    css += `    /* ${colorName.charAt(0).toUpperCase() + colorName.slice(1)} Colors */\n`;
    for (const [shade, value] of Object.entries(colorValue)) {
      if (shade === "DEFAULT" || shade === "foreground") continue;
      css += `    --color-${colorName}-${shade}: ${value};\n`;
    }
    if (colorValue && "DEFAULT" in colorValue) {
      css += `    --color-${colorName}: ${colorValue.DEFAULT};\n`;
    }
    if (colorValue && "foreground" in colorValue) {
      css += `    --color-${colorName}-foreground: ${colorValue.foreground};\n`;
    }
    css += `\n`;
  } else if (colorValue != null) {
    css += `    --color-${toKebabCase(colorName)}: ${colorValue};\n`;
  }
}

// Typography
css += `\n  /* Typography */\n\n`;
for (const [key, value] of Object.entries(typography)) {
  if (value && typeof value === "object") {
    for (const [subKey, subValue] of Object.entries(value)) {
      if (Array.isArray(subValue)) {
        css += `    --${toKebabCase(key)}-${toKebabCase(subKey)}: ${subValue.join(", ")};\n`;
      } else {
        css += `    --${toKebabCase(key)}-${toKebabCase(subKey)}: ${subValue};\n`;
      }
    }
    css += `\n`;
  } else if (value != null) {
    css += `    --font-${toKebabCase(key)}: ${value};\n`;
  }
}

// Spacing
css += `\n  /* Spacing */\n\n`;
for (const [key, value] of Object.entries(spacing)) {
  if (value != null) {
    css += `    --spacing-${key}: ${value};\n`;
  }
}
css += `\n`;

// Breakpoints
css += `\n  /* Breakpoints */\n\n`;
for (const [key, value] of Object.entries(breakpoints)) {
  if (value != null) {
    css += `    --breakpoint-${toKebabCase(key)}: ${value};\n`;
  }
}
css += `\n`;

// Shadows
css += `\n  /* Shadows */\n\n`;
for (const [key, value] of Object.entries(shadows)) {
  if (value != null) {
    css += `    --shadow-${toKebabCase(key)}: ${value};\n`;
  }
}
css += `\n`;

// End @theme block
css += `}\n\n`;

fs.writeFileSync(path.resolve(__dirname, "../shared-styles.css"), css);

console.log("Generated shared-styles.css from theme tokens!");
