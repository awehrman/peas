-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "isComposedIngredient" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UniqueLinePattern" ADD COLUMN     "exampleLine" TEXT,
ADD COLUMN     "exampleValues" JSONB;
