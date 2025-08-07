/*
  Warnings:

  - You are about to drop the column `patternShorthand` on the `ParsedIngredientLine` table. All the data in the column will be lost.
  - You are about to drop the column `uniqueLinePatternId` on the `ParsedIngredientLine` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ParsedIngredientLine" DROP COLUMN "patternShorthand",
DROP COLUMN "uniqueLinePatternId";
