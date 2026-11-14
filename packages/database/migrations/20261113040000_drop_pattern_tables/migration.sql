-- Phase 7: the v1 pattern tracking tables. Nothing has written them since the v2 cutover.

-- DropForeignKey
ALTER TABLE "ParsedIngredientLine" DROP CONSTRAINT "ParsedIngredientLine_uniqueLinePatternId_fkey";

-- DropForeignKey
ALTER TABLE "ParsedSegment" DROP CONSTRAINT "ParsedSegment_ruleId_fkey";

-- DropIndex
DROP INDEX "ParsedIngredientLine_uniqueLinePatternId_idx";

-- AlterTable
ALTER TABLE "ParsedIngredientLine" DROP COLUMN "uniqueLinePatternId";

-- AlterTable (drops ParsedSegment_ruleId_idx with the column)
ALTER TABLE "ParsedSegment" DROP COLUMN "ruleId";

-- DropTable
DROP TABLE "ParsingRule";

-- DropTable
DROP TABLE "UniqueLinePattern";
