-- CreateEnum
CREATE TYPE "StructureProposalStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED', 'CHANGED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "LineKind" AS ENUM ('INGREDIENT', 'INSTRUCTION', 'SECTION_HEADING', 'NOTE', 'OTHER');

-- AlterTable
ALTER TABLE "ParsedIngredientLine" ADD COLUMN     "contentIndex" INTEGER,
ADD COLUMN     "elementTag" TEXT,
ADD COLUMN     "lineKind" "LineKind" NOT NULL DEFAULT 'INGREDIENT';

-- AlterTable
ALTER TABLE "ParsedInstructionLine" ADD COLUMN     "contentIndex" INTEGER,
ADD COLUMN     "elementTag" TEXT,
ADD COLUMN     "lineKind" "LineKind" NOT NULL DEFAULT 'INSTRUCTION';

-- CreateTable
CREATE TABLE "StructureProposal" (
    "id" UUID NOT NULL,
    "noteId" TEXT NOT NULL,
    "contentIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "assignedKind" TEXT NOT NULL,
    "proposal" JSONB NOT NULL,
    "proposedLabel" TEXT NOT NULL,
    "patternKey" TEXT NOT NULL,
    "margin" DOUBLE PRECISION NOT NULL,
    "signals" JSONB NOT NULL,
    "classifierVersion" TEXT NOT NULL,
    "status" "StructureProposalStatus" NOT NULL DEFAULT 'OPEN',
    "decidedLabel" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "effects" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StructureProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StructureProposal_status_patternKey_idx" ON "StructureProposal"("status", "patternKey");

-- CreateIndex
CREATE UNIQUE INDEX "StructureProposal_noteId_contentIndex_textHash_key" ON "StructureProposal"("noteId", "contentIndex", "textHash");

-- AddForeignKey
ALTER TABLE "StructureProposal" ADD CONSTRAINT "StructureProposal_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StructureProposal" ADD CONSTRAINT "StructureProposal_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

