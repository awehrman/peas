/*
  Warnings:

  - You are about to drop the column `type` on the `Source` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Source" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "URL" ADD COLUMN     "domainName" TEXT;

-- DropEnum
DROP TYPE "SourceType";
