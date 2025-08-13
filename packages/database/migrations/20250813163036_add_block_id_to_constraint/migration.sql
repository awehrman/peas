/*
  Warnings:

  - A unique constraint covering the columns `[noteId,blockIndex,lineIndex]` on the table `ParsedIngredientLine` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ParsedIngredientLine_noteId_lineIndex_key";

-- CreateIndex
CREATE UNIQUE INDEX "ParsedIngredientLine_noteId_blockIndex_lineIndex_key" ON "ParsedIngredientLine"("noteId", "blockIndex", "lineIndex");
