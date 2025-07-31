-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_evernoteMetadataId_fkey";

-- DropForeignKey
ALTER TABLE "QueueJob" DROP CONSTRAINT "QueueJob_noteId_fkey";

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_evernoteMetadataId_fkey" FOREIGN KEY ("evernoteMetadataId") REFERENCES "EvernoteMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueJob" ADD CONSTRAINT "QueueJob_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
