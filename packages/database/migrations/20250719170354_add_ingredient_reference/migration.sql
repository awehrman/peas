-- CreateTable
CREATE TABLE "IngredientReference" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "parsedLineId" TEXT NOT NULL,
    "segmentIndex" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "noteId" TEXT,
    "confidence" DOUBLE PRECISION,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngredientReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngredientReference_ingredientId_idx" ON "IngredientReference"("ingredientId");

-- CreateIndex
CREATE INDEX "IngredientReference_parsedLineId_idx" ON "IngredientReference"("parsedLineId");

-- CreateIndex
CREATE INDEX "IngredientReference_noteId_idx" ON "IngredientReference"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientReference_ingredientId_parsedLineId_segmentIndex_key" ON "IngredientReference"("ingredientId", "parsedLineId", "segmentIndex");

-- AddForeignKey
ALTER TABLE "IngredientReference" ADD CONSTRAINT "IngredientReference_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientReference" ADD CONSTRAINT "IngredientReference_parsedLineId_fkey" FOREIGN KEY ("parsedLineId") REFERENCES "ParsedIngredientLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
