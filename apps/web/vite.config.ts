import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";

/** Env files live at the repo root, shared with the queue and the database package. */
const ENV_DIR = "../..";

export default defineConfig(({ mode }) => {
  // @peas/features still reads process.env.NEXT_PUBLIC_* (upload endpoint, websocket settings); inline them for the browser bundle.
  const publicEnv = loadEnv(mode, ENV_DIR, "NEXT_PUBLIC_");

  return {
    envDir: ENV_DIR,
    server: { port: 3100, strictPort: true },
    preview: { port: 3100 },
    resolve: { tsconfigPaths: true },
    define: Object.fromEntries(
      Object.entries(publicEnv).map(([key, value]) => [
        `process.env.${key}`,
        JSON.stringify(value),
      ])
    ),
    plugins: [
      tailwindcss(),
      tanstackStart({ srcDirectory: "src" }),
      viteReact(),
      nitro(),
    ],
  };
});
