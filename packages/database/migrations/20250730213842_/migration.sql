/*
  Warnings:

  - You are about to drop the column `evernoteTags` on the `EvernoteMetadata` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EvernoteMetadata" DROP COLUMN "evernoteTags",
ADD COLUMN     "originalCreatedAt" TIMESTAMP(3),
ADD COLUMN     "tags" TEXT[];
