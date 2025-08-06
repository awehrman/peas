/*
  Warnings:

  - The values [PENDING,CORRECT,INCORRECT,ERROR] on the enum `ParseStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('UNREVIEWED', 'CORRECT', 'INCORRECT');

-- AlterEnum
BEGIN;
CREATE TYPE "ParseStatus_new" AS ENUM ('AWAITING_PARSING', 'COMPLETED_WITH_ERROR', 'COMPLETED_SUCCESSFULLY');
ALTER TABLE "ParsedIngredientLine" ALTER COLUMN "parseStatus" DROP DEFAULT;
ALTER TABLE "ParsedInstructionLine" ALTER COLUMN "parseStatus" DROP DEFAULT;
ALTER TABLE "ParsedIngredientLine" ALTER COLUMN "parseStatus" TYPE "ParseStatus_new" USING ("parseStatus"::text::"ParseStatus_new");
ALTER TABLE "ParsedInstructionLine" ALTER COLUMN "parseStatus" TYPE "ParseStatus_new" USING ("parseStatus"::text::"ParseStatus_new");
ALTER TYPE "ParseStatus" RENAME TO "ParseStatus_old";
ALTER TYPE "ParseStatus_new" RENAME TO "ParseStatus";
DROP TYPE "ParseStatus_old";
ALTER TABLE "ParsedIngredientLine" ALTER COLUMN "parseStatus" SET DEFAULT 'AWAITING_PARSING';
ALTER TABLE "ParsedInstructionLine" ALTER COLUMN "parseStatus" SET DEFAULT 'AWAITING_PARSING';
COMMIT;

-- AlterTable
ALTER TABLE "ParsedIngredientLine" ADD COLUMN     "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
ALTER COLUMN "parseStatus" SET DEFAULT 'AWAITING_PARSING';

-- AlterTable
ALTER TABLE "ParsedInstructionLine" ADD COLUMN     "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
ALTER COLUMN "parseStatus" SET DEFAULT 'AWAITING_PARSING';
