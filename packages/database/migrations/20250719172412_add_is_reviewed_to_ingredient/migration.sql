-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "isReviewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewedAt" TIMESTAMP(3);
