/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Note` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Note" DROP COLUMN "imageUrl",
ADD COLUMN     "croppedImageUrl" TEXT,
ADD COLUMN     "originalImageUrl" TEXT,
ADD COLUMN     "thumbnailImageUrl" TEXT;
