-- AlterTable
ALTER TABLE "ParsedIngredientLine" ADD COLUMN     "patternCode" TEXT,
ADD COLUMN     "patternShorthand" TEXT,
ADD COLUMN     "uniqueLinePatternId" TEXT;

-- CreateIndex
CREATE INDEX "ParsedIngredientLine_patternCode_idx" ON "ParsedIngredientLine"("patternCode");

-- AddForeignKey
ALTER TABLE "ParsedIngredientLine" ADD CONSTRAINT "ParsedIngredientLine_patternCode_fkey" FOREIGN KEY ("patternCode") REFERENCES "UniqueLinePattern"("patternCode") ON DELETE SET NULL ON UPDATE CASCADE;
