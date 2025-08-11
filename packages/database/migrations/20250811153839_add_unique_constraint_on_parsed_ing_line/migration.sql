/*
  Warnings:

  - A unique constraint covering the columns `[noteId,lineIndex]` on the table `ParsedIngredientLine` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ParsedIngredientLine_noteId_lineIndex_key" ON "ParsedIngredientLine"("noteId", "lineIndex");
