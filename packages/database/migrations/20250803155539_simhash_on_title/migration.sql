-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "titleSimHash" TEXT;

-- CreateIndex
CREATE INDEX "Note_titleSimHash_idx" ON "Note"("titleSimHash");
