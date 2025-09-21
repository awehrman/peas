import type { StorybookConfig } from "@storybook/react-vite";
import type { UserConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-onboarding",
    "@chromatic-com/storybook",
    "@storybook/experimental-addon-test",
    {
      name: "@storybook/addon-styling",
      options: {
        postCss: true,
      },
    },
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config: UserConfig) => {
    return {
      ...config,
      define: {
        ...config.define,
        // Fix Node.js globals for browser compatibility
        "process.env": {},
        global: "globalThis",
      },
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          // Provide browser-compatible alternatives for Node.js modules
          path: "path-browserify",
          fs: "browserify-fs",
          os: "os-browserify/browser",
          crypto: "crypto-browserify",
          stream: "stream-browserify",
          util: "util",
          // Mock server-side packages for browser compatibility
          "@peas/database": new URL("./database-mock.js", import.meta.url)
            .pathname,
          "@prisma/client": new URL("./prisma-mock.js", import.meta.url)
            .pathname,
        },
      },
      optimizeDeps: {
        ...config.optimizeDeps,
        include: [
          ...((config.optimizeDeps?.include as string[]) || []),
          // Include browser polyfills for Node.js modules
          "path-browserify",
          "browserify-fs",
          "os-browserify/browser",
          "crypto-browserify",
          "stream-browserify",
          "util",
        ],
        exclude: [
          ...((config.optimizeDeps?.exclude as string[]) || []),
          // Exclude server-side packages
          "@peas/database",
          "@prisma/client",
        ],
      },
      // Let Vite use the existing postcss.config.mjs
    };
  },
};
export default config;
