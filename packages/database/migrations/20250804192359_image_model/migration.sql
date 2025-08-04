/*
  Warnings:

  - You are about to drop the column `croppedImageUrl` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `originalImageUrl` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailImageUrl` on the `Note` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Note" DROP COLUMN "croppedImageUrl",
DROP COLUMN "originalImageUrl",
DROP COLUMN "thumbnailImageUrl";

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "originalImageUrl" TEXT NOT NULL,
    "thumbnailImageUrl" TEXT,
    "crop3x2ImageUrl" TEXT,
    "crop4x3ImageUrl" TEXT,
    "crop16x9ImageUrl" TEXT,
    "originalWidth" INTEGER,
    "originalHeight" INTEGER,
    "originalSize" INTEGER,
    "originalFormat" TEXT,
    "processingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "processingError" TEXT,
    "noteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Image_noteId_idx" ON "Image"("noteId");

-- CreateIndex
CREATE INDEX "Image_processingStatus_idx" ON "Image"("processingStatus");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
