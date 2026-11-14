// scripts/build-styles.ts
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var OUTPUT_PATH = path.resolve(__dirname, "../shared-styles.css");
var WATCH_FLAG = "--watch";
var isWatchMode = process.argv.includes(WATCH_FLAG);
var LOG_PREFIX = "[tailwind:tokens]";
function toKebabCase(str) {
  return str.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}
function log(message) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  console.log(`${LOG_PREFIX} ${timestamp} ${message}`);
}
async function resolveThemeModule() {
  const specifier = await import.meta.resolve("@peas/theme");
  if (specifier.startsWith("file://")) {
    return specifier;
  }
  return pathToFileURL(specifier).href;
}
async function loadThemeTokens() {
  const themeModuleHref = await resolveThemeModule();
  const cacheBuster = themeModuleHref.includes("?") ? `${themeModuleHref}&t=${Date.now()}` : `${themeModuleHref}?t=${Date.now()}`;
  const themeModule = await import(cacheBuster);
  if (!themeModule.colors || !themeModule.typography || !themeModule.spacing || !themeModule.breakpoints || !themeModule.shadows) {
    throw new Error("Theme module did not export expected token groups.");
  }
  return {
    colors: themeModule.colors,
    typography: themeModule.typography,
    spacing: themeModule.spacing,
    breakpoints: themeModule.breakpoints,
    shadows: themeModule.shadows
  };
}
function buildCss({
  colors,
  typography,
  spacing,
  breakpoints,
  shadows
}) {
  let css = `@import "tailwindcss";

`;
  css += `@custom-variant dark (&:where(.dark, .dark *));

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
      for (const [shade, value] of Object.entries(
        colorValue
      )) {
        if (shade === "DEFAULT" || shade === "foreground") {
          continue;
        }
        css += `    --color-${colorName}-${shade}: ${value};
`;
      }
      if (typeof colorValue === "object" && "DEFAULT" in colorValue) {
        css += `    --color-${colorName}: ${colorValue.DEFAULT};
`;
      }
      if (typeof colorValue === "object" && "foreground" in colorValue) {
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
  const typographyGroups = typography;
  const lineHeights = typographyGroups.lineHeight ?? {};
  for (const [family, stack] of Object.entries(typographyGroups.fontFamily ?? {})) {
    css += `    --font-${family}: ${Array.isArray(stack) ? stack.join(", ") : stack};
`;
  }
  css += `
`;
  for (const [size, value] of Object.entries(typographyGroups.fontSize ?? {})) {
    css += `    --text-${size}: ${value};
`;
    if (lineHeights[size] != null) {
      css += `    --text-${size}--line-height: ${lineHeights[size]};
`;
    }
  }
  css += `
`;
  for (const [weight, value] of Object.entries(typographyGroups.fontWeight ?? {})) {
    css += `    --font-weight-${weight}: ${value};
`;
  }
  css += `
`;
  for (const [tracking, value] of Object.entries(typographyGroups.tracking ?? {})) {
    css += `    --tracking-${tracking}: ${value};
`;
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
  css += `@layer base {
  *, ::after, ::before, ::backdrop, ::file-selector-button {
    border-color: var(--color-border);
  }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body {
    color: var(--color-foreground);
    background-color: var(--color-background);
  }

  h1, h2, h3 {
    letter-spacing: var(--tracking-tight);
  }
}
`;
  return css;
}
var isGenerating = false;
var pendingGeneration = false;
async function writeTokens() {
  if (isGenerating) {
    log("generation already in progress, marking pending rerun");
    pendingGeneration = true;
    return;
  }
  isGenerating = true;
  try {
    log("loading theme module");
    const themeTokens = await loadThemeTokens();
    const headerColor = typeof themeTokens.colors.header === "object" && themeTokens.colors.header != null && "DEFAULT" in themeTokens.colors.header ? themeTokens.colors.header.DEFAULT : "n/a";
    log(`loaded theme tokens (header DEFAULT: ${String(headerColor)})`);
    const css = buildCss(themeTokens);
    fs.writeFileSync(OUTPUT_PATH, css);
    log(`wrote ${path.relative(process.cwd(), OUTPUT_PATH)}`);
    await notifyConsumers();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error while generating tokens.";
    console.error(
      `${LOG_PREFIX} ${(/* @__PURE__ */ new Date()).toISOString()} generation failed: ${message}`
    );
  } finally {
    isGenerating = false;
    if (pendingGeneration) {
      log("pending rerun detected, restarting generation");
      pendingGeneration = false;
      await writeTokens();
    }
  }
}
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => fn(...args), delay);
  };
}
function startWatch() {
  const watchTargets = [
    { path: path.resolve(__dirname, "../../theme"), recursive: true },
    {
      path: path.resolve(__dirname, "../../theme/dist"),
      recursive: true,
      skipIfMissing: true
    },
    {
      path: path.resolve(__dirname, "../../theme/src"),
      recursive: true,
      skipIfMissing: true
    }
  ];
  const scheduleGeneration = debounce(() => {
    void writeTokens();
  }, 200);
  for (const target of watchTargets) {
    if (target.skipIfMissing && !fs.existsSync(target.path)) {
      continue;
    }
    try {
      fs.watch(target.path, { recursive: target.recursive }, (_, filename) => {
        const label = filename ? path.join(path.relative(process.cwd(), target.path), filename) : path.relative(process.cwd(), target.path);
        log(`change detected: ${label}`);
        scheduleGeneration();
      });
      log(`watching ${path.relative(process.cwd(), target.path)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown watcher error.";
      console.warn(
        `${LOG_PREFIX} ${(/* @__PURE__ */ new Date()).toISOString()} failed to watch ${target.path}: ${message}`
      );
    }
  }
}
async function notifyConsumers() {
  const targets = [
    {
      label: "@peas/components/src/styles.css",
      filePath: path.resolve(__dirname, "../../components/src/styles.css")
    },
    {
      label: "@peas/features/src/styles.css",
      filePath: path.resolve(__dirname, "../../features/src/styles.css")
    },
    {
      label: "@peas/web/src/styles/app.css",
      filePath: path.resolve(__dirname, "../../../apps/web/src/styles/app.css")
    }
  ];
  await Promise.all(
    targets.map(async ({ label, filePath }) => {
      try {
        const now = /* @__PURE__ */ new Date();
        await fs.promises.utimes(filePath, now, now);
        log(`notified consumer: ${label}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown consumer notification error.";
        console.warn(
          `${LOG_PREFIX} ${(/* @__PURE__ */ new Date()).toISOString()} failed to notify consumer ${label}: ${message}`
        );
      }
    })
  );
}
await writeTokens();
if (isWatchMode) {
  log("watch mode enabled");
  startWatch();
}
