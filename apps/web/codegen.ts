import type { CodegenConfig } from "@graphql-codegen/cli";

/**
 * Typed documents for every operation in src/graphql/operations, generated against the @peas/api schema. Apollo recommends typescript-operations plus typed-document-node over the client preset.
 */
const config: CodegenConfig = {
  overwrite: true,
  schema: "../../packages/api/src/schema/schema.graphql",
  documents: ["src/graphql/operations/**/*.graphql"],
  generates: {
    "src/graphql/generated.ts": {
      plugins: ["typescript-operations", "typed-document-node"],
      config: {
        useTypeImports: true,
        enumType: "string-literal",
        nonOptionalTypename: true,
        skipTypeNameForRoot: true,
      },
    },
    // Apollo needs every interface's implementations to match fragments such as `PayloadFields on MutationPayload`.
    "src/graphql/possible-types.ts": {
      plugins: ["fragment-matcher"],
      config: { apolloClientVersion: 3, useExplicitTyping: true },
    },
  },
};

export default config;
