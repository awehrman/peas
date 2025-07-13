-- DropForeignKey
ALTER TABLE "NoteStatusEvent" DROP CONSTRAINT "NoteStatusEvent_noteId_fkey";

-- AddForeignKey
ALTER TABLE "NoteStatusEvent" ADD CONSTRAINT "NoteStatusEvent_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
