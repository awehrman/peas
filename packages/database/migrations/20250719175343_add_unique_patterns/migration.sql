-- CreateTable
CREATE TABLE "UniqueLinePattern" (
    "id" TEXT NOT NULL,
    "patternCode" TEXT NOT NULL,
    "ruleSequence" JSONB NOT NULL,
    "description" TEXT,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UniqueLinePattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UniqueLinePattern_patternCode_key" ON "UniqueLinePattern"("patternCode");

-- CreateIndex
CREATE INDEX "UniqueLinePattern_patternCode_idx" ON "UniqueLinePattern"("patternCode");

-- CreateIndex
CREATE INDEX "UniqueLinePattern_occurrenceCount_idx" ON "UniqueLinePattern"("occurrenceCount");
