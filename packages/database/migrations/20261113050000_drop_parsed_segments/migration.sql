-- Phase 7: v1 parsed segments. Ingredient mentions replaced them at the v2 cutover.

-- DropForeignKey
ALTER TABLE "ParsedSegment" DROP CONSTRAINT "ParsedSegment_ingredientLineId_fkey";

-- AlterTable
ALTER TABLE "ParsedIngredientLine" DROP COLUMN "rule";

-- DropTable
DROP TABLE "ParsedSegment";
