-- Removes the runtime-compiled (database-authored) grammar and the parser switch.
-- Contents were exported first by scripts/export-grammar-archive.js to
-- packages/parser/legacy/dynamic-archive/.

-- DropForeignKey
ALTER TABLE "public"."AppSetting" DROP CONSTRAINT "AppSetting_activeGrammarVersionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GrammarRuleDefinition" DROP CONSTRAINT "GrammarRuleDefinition_grammarRuleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GrammarTestExpectation" DROP CONSTRAINT "GrammarTestExpectation_grammarTestId_fkey";

-- DropTable
DROP TABLE "public"."AppSetting";

-- DropTable
DROP TABLE "public"."GrammarRule";

-- DropTable
DROP TABLE "public"."GrammarRuleDefinition";

-- DropTable
DROP TABLE "public"."GrammarTest";

-- DropTable
DROP TABLE "public"."GrammarTestExpectation";

-- DropTable
DROP TABLE "public"."GrammarVersion";

-- DropEnum
DROP TYPE "public"."ActiveParser";

-- DropEnum
DROP TYPE "public"."GrammarRuleDefinitionType";

