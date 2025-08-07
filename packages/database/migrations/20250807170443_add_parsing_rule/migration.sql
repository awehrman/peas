/*
  Warnings:

  - You are about to drop the column `patternCode` on the `ParsedIngredientLine` table. All the data in the column will be lost.
  - You are about to drop the column `firstSeenAt` on the `UniqueLinePattern` table. All the data in the column will be lost.
  - You are about to drop the column `lastSeenAt` on the `UniqueLinePattern` table. All the data in the column will be lost.
  - You are about to drop the column `patternCode` on the `UniqueLinePattern` table. All the data in the column will be lost.
  - You are about to drop the column `ruleSequence` on the `UniqueLinePattern` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ruleIds]` on the table `UniqueLinePattern` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ParsedIngredientLine" DROP CONSTRAINT "ParsedIngredientLine_patternCode_fkey";

-- DropIndex
DROP INDEX "ParsedIngredientLine_patternCode_idx";

-- DropIndex
DROP INDEX "UniqueLinePattern_patternCode_idx";

-- DropIndex
DROP INDEX "UniqueLinePattern_patternCode_key";

-- AlterTable
ALTER TABLE "ParsedIngredientLine" DROP COLUMN "patternCode",
ADD COLUMN     "uniqueLinePatternId" TEXT;

-- AlterTable
ALTER TABLE "ParsedSegment" ADD COLUMN     "ruleId" TEXT;

-- AlterTable
ALTER TABLE "UniqueLinePattern" DROP COLUMN "firstSeenAt",
DROP COLUMN "lastSeenAt",
DROP COLUMN "patternCode",
DROP COLUMN "ruleSequence",
ADD COLUMN     "ruleIds" TEXT[];

-- CreateTable
CREATE TABLE "ParsingRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParsingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParsingRule_name_key" ON "ParsingRule"("name");

-- CreateIndex
CREATE INDEX "ParsingRule_name_idx" ON "ParsingRule"("name");

-- CreateIndex
CREATE INDEX "ParsedIngredientLine_uniqueLinePatternId_idx" ON "ParsedIngredientLine"("uniqueLinePatternId");

-- CreateIndex
CREATE INDEX "ParsedSegment_ruleId_idx" ON "ParsedSegment"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "UniqueLinePattern_ruleIds_key" ON "UniqueLinePattern"("ruleIds");

-- AddForeignKey
ALTER TABLE "ParsedIngredientLine" ADD CONSTRAINT "ParsedIngredientLine_uniqueLinePatternId_fkey" FOREIGN KEY ("uniqueLinePatternId") REFERENCES "UniqueLinePattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParsedSegment" ADD CONSTRAINT "ParsedSegment_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ParsingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
