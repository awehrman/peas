/*
  Warnings:

  - You are about to drop the column `domainName` on the `URL` table. All the data in the column will be lost.
  - You are about to drop the column `siteName` on the `URL` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "URL" DROP COLUMN "domainName",
DROP COLUMN "siteName",
ADD COLUMN     "isBrokenLink" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastAccessed" TIMESTAMP(3),
ADD COLUMN     "websiteId" TEXT;

-- CreateTable
CREATE TABLE "Website" (
    "id" TEXT NOT NULL,
    "siteName" TEXT,
    "domainName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Website_siteName_idx" ON "Website"("siteName");

-- CreateIndex
CREATE UNIQUE INDEX "Website_domainName_key" ON "Website"("domainName");

-- CreateIndex
CREATE INDEX "URL_url_idx" ON "URL"("url");

-- CreateIndex
CREATE INDEX "URL_lastAccessed_idx" ON "URL"("lastAccessed");

-- CreateIndex
CREATE INDEX "URL_isBrokenLink_idx" ON "URL"("isBrokenLink");

-- AddForeignKey
ALTER TABLE "URL" ADD CONSTRAINT "URL_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE SET NULL ON UPDATE CASCADE;
