import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, "../shared-styles.css");
const WATCH_FLAG = "--watch";
const isWatchMode = process.argv.includes(WATCH_FLAG);
const LOG_PREFIX = "[tailwind:tokens]";

type ThemeModule = {
  colors: Record<string, unknown>;
  typography: Record<string, unknown>;
  spacing: Record<string, unknown>;
  breakpoints: Record<string, unknown>;
  shadows: Record<string, unknown>;
};

function toKebabCase(str: string) {
  return str.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`${LOG_PREFIX} ${timestamp} ${message}`);
}

async function resolveThemeModule(): Promise<string> {
  const specifier = await import.meta.resolve("@peas/theme");
  if (specifier.startsWith("file://")) {
    return specifier;
  }
  return pathToFileURL(specifier).href;
}

async function loadThemeTokens(): Promise<ThemeModule> {
  const themeModuleHref = await resolveThemeModule();
  const cacheBuster = themeModuleHref.includes("?")
    ? `${themeModuleHref}&t=${Date.now()}`
    : `${themeModuleHref}?t=${Date.now()}`;

  const themeModule = (await import(cacheBuster)) as Partial<ThemeModule>;

  if (
    !themeModule.colors ||
    !themeModule.typography ||
    !themeModule.spacing ||
    !themeModule.breakpoints ||
    !themeModule.shadows
  ) {
    throw new Error("Theme module did not export expected token groups.");
  }

  return {
    colors: themeModule.colors,
    typography: themeModule.typography,
    spacing: themeModule.spacing,
    breakpoints: themeModule.breakpoints,
    shadows: themeModule.shadows,
  };
}

function buildCss({
  colors,
  typography,
  spacing,
  breakpoints,
  shadows,
}: ThemeModule) {
  let css = `@import "tailwindcss";\n\n`;
  // dark: utilities follow the ThemeProvider's .dark class, not the OS setting
  css += `@custom-variant dark (&:where(.dark, .dark *));\n\n`;
  css += `\n/* ================= Theme Tokens ================= */\n@theme {\n`;

  css += `\n  /* Colors */\n\n`;
  for (const [colorName, colorValue] of Object.entries(colors)) {
    if (colorValue && typeof colorValue === "object") {
      css += `    /* ${
        colorName.charAt(0).toUpperCase() + colorName.slice(1)
      } Colors */\n`;
      for (const [shade, value] of Object.entries(
        colorValue as Record<string, unknown>
      )) {
        if (shade === "DEFAULT" || shade === "foreground") {
          continue;
        }
        css += `    --color-${colorName}-${shade}: ${value};\n`;
      }
      if (
        typeof colorValue === "object" &&
        "DEFAULT" in (colorValue as Record<string, unknown>)
      ) {
        css += `    --color-${colorName}: ${
          (colorValue as Record<string, unknown>).DEFAULT
        };\n`;
      }
      if (
        typeof colorValue === "object" &&
        "foreground" in (colorValue as Record<string, unknown>)
      ) {
        css += `    --color-${colorName}-foreground: ${
          (colorValue as Record<string, unknown>).foreground
        };\n`;
      }
      css += `\n`;
    } else if (colorValue != null) {
      css += `    --color-${toKebabCase(colorName)}: ${colorValue};\n`;
    }
  }

  // Tailwind v4 namespaces: --font-* (families), --text-* (sizes, with
  // --text-*--line-height), --font-weight-*, --tracking-*
  css += `\n  /* Typography */\n\n`;
  const typographyGroups = typography as Record<string, Record<string, unknown> | undefined>;
  const lineHeights = typographyGroups.lineHeight ?? {};

  for (const [family, stack] of Object.entries(typographyGroups.fontFamily ?? {})) {
    css += `    --font-${family}: ${Array.isArray(stack) ? stack.join(", ") : stack};\n`;
  }
  css += `\n`;
  for (const [size, value] of Object.entries(typographyGroups.fontSize ?? {})) {
    css += `    --text-${size}: ${value};\n`;
    if (lineHeights[size] != null) {
      css += `    --text-${size}--line-height: ${lineHeights[size]};\n`;
    }
  }
  css += `\n`;
  for (const [weight, value] of Object.entries(typographyGroups.fontWeight ?? {})) {
    css += `    --font-weight-${weight}: ${value};\n`;
  }
  css += `\n`;
  for (const [tracking, value] of Object.entries(typographyGroups.tracking ?? {})) {
    css += `    --tracking-${tracking}: ${value};\n`;
  }

  css += `\n  /* Spacing */\n\n`;
  for (const [key, value] of Object.entries(spacing)) {
    if (value != null) {
      css += `    --spacing-${key}: ${value};\n`;
    }
  }
  css += `\n`;

  css += `\n  /* Breakpoints */\n\n`;
  for (const [key, value] of Object.entries(breakpoints)) {
    if (value != null) {
      css += `    --breakpoint-${toKebabCase(key)}: ${value};\n`;
    }
  }
  css += `\n`;

  css += `\n  /* Shadows */\n\n`;
  for (const [key, value] of Object.entries(shadows)) {
    if (value != null) {
      css += `    --shadow-${toKebabCase(key)}: ${value};\n`;
    }
  }
  css += `\n`;
  css += `}\n\n`;
  // Tailwind v4 borders default to currentColor; use the soft border token instead
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

let isGenerating = false;
let pendingGeneration = false;

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
    const headerColor =
      typeof themeTokens.colors.header === "object" &&
      themeTokens.colors.header != null &&
      "DEFAULT" in (themeTokens.colors.header as Record<string, unknown>)
        ? (themeTokens.colors.header as Record<string, unknown>).DEFAULT
        : "n/a";
    log(`loaded theme tokens (header DEFAULT: ${String(headerColor)})`);

    const css = buildCss(themeTokens);
    fs.writeFileSync(OUTPUT_PATH, css);
    log(`wrote ${path.relative(process.cwd(), OUTPUT_PATH)}`);
    await notifyConsumers();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error while generating tokens.";
    console.error(
      `${LOG_PREFIX} ${new Date().toISOString()} generation failed: ${message}`
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

function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: T) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => fn(...args), delay);
  };
}

function startWatch() {
  const watchTargets: Array<{
    path: string;
    recursive: boolean;
    skipIfMissing?: boolean;
  }> = [
    { path: path.resolve(__dirname, "../../theme"), recursive: true },
    {
      path: path.resolve(__dirname, "../../theme/dist"),
      recursive: true,
      skipIfMissing: true,
    },
    {
      path: path.resolve(__dirname, "../../theme/src"),
      recursive: true,
      skipIfMissing: true,
    },
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
        const label = filename
          ? path.join(path.relative(process.cwd(), target.path), filename)
          : path.relative(process.cwd(), target.path);
        log(`change detected: ${label}`);
        scheduleGeneration();
      });
      log(`watching ${path.relative(process.cwd(), target.path)}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown watcher error.";
      console.warn(
        `${LOG_PREFIX} ${new Date().toISOString()} failed to watch ${target.path}: ${message}`
      );
    }
  }
}

async function notifyConsumers() {
  const targets = [
    {
      label: "@peas/components/src/styles.css",
      filePath: path.resolve(__dirname, "../../components/src/styles.css"),
    },
    {
      label: "@peas/features/src/styles.css",
      filePath: path.resolve(__dirname, "../../features/src/styles.css"),
    },
    {
      label: "@peas/web/src/styles/app.css",
      filePath: path.resolve(__dirname, "../../../apps/web/src/styles/app.css"),
    },
  ];

  await Promise.all(
    targets.map(async ({ label, filePath }) => {
      try {
        const now = new Date();
        await fs.promises.utimes(filePath, now, now);
        log(`notified consumer: ${label}`);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown consumer notification error.";
        console.warn(
          `${LOG_PREFIX} ${new Date().toISOString()} failed to notify consumer ${label}: ${message}`
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
