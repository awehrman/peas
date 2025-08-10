/*
  Warnings:

  - A unique constraint covering the columns `[importId]` on the table `Image` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "importId" TEXT;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "importId" TEXT;

-- CreateIndex
CREATE INDEX "Image_importId_idx" ON "Image"("importId");

-- CreateIndex
CREATE UNIQUE INDEX "Image_importId_key" ON "Image"("importId");

-- CreateIndex
CREATE INDEX "Note_importId_idx" ON "Note"("importId");
