/*
  Warnings:

  - You are about to drop the column `containsParsingErrors` on the `ParsedIngredientLine` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('PENDING', 'CORRECT', 'INCORRECT', 'ERROR');

-- DropForeignKey
ALTER TABLE "ParsedIngredientLine" DROP CONSTRAINT "ParsedIngredientLine_noteId_fkey";

-- DropForeignKey
ALTER TABLE "ParsedInstructionLine" DROP CONSTRAINT "ParsedInstructionLine_noteId_fkey";

-- DropForeignKey
ALTER TABLE "ParsedSegment" DROP CONSTRAINT "ParsedSegment_ingredientLineId_fkey";

-- AlterTable
ALTER TABLE "ParsedIngredientLine" DROP COLUMN "containsParsingErrors",
ADD COLUMN     "parseStatus" "ParseStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "ParsedInstructionLine" ADD COLUMN     "parseStatus" "ParseStatus" NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "ParsedIngredientLine" ADD CONSTRAINT "ParsedIngredientLine_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParsedInstructionLine" ADD CONSTRAINT "ParsedInstructionLine_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParsedSegment" ADD CONSTRAINT "ParsedSegment_ingredientLineId_fkey" FOREIGN KEY ("ingredientLineId") REFERENCES "ParsedIngredientLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
