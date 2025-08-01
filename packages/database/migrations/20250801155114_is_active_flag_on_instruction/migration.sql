-- AlterTable
ALTER TABLE "ParsedIngredientLine" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ParsedInstructionLine" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "ParsedIngredientLine_isActive_idx" ON "ParsedIngredientLine"("isActive");

-- CreateIndex
CREATE INDEX "ParsedInstructionLine_isActive_idx" ON "ParsedInstructionLine"("isActive");
