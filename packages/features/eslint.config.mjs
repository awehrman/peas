import config from "@peas/eslint-config";

export default [
  ...config,
  {
    ignores: ["dist/**", "**/*.test.ts", "**/*.test.tsx", "**/__tests__/**"],
  },
  {
    languageOptions: {
      globals: {
        // Browser APIs
        fetch: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        performance: "readonly",
        WebSocket: "readonly",
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        // Test globals (in case some test files are still processed)
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        jest: "readonly",
      },
    },
  },
];
