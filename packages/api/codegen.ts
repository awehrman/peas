import type { CodegenConfig } from "@graphql-codegen/cli";

/**
 * Server resolver types. The web app generates its own operation types from the same schema (apps/web/codegen.ts).
 */
const config: CodegenConfig = {
  overwrite: true,
  schema: "src/schema/schema.graphql",
  generates: {
    "src/generated/resolvers-types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        useTypeImports: true,
        enumsAsTypes: true,
        contextType: "../context.js#ApiContext",
        scalars: { JSON: "unknown" },
        mappers: {
          Concept: "./teach-views-types.js#ConceptParent",
          Discovery: "./teach-views-types.js#DiscoveryParent",
          IngredientLine: "./teach-views-types.js#IngredientLineParent",
          LexiconEntryDetail: "./teach-views-types.js#LexiconEntryDetailParent",
        },
      },
    },
  },
};

export default config;
