-- CreateIndex
CREATE INDEX "NoteStatusEvent_noteId_createdAt_idx" ON "NoteStatusEvent"("noteId", "createdAt");

-- CreateIndex
CREATE INDEX "NoteStatusEvent_status_createdAt_idx" ON "NoteStatusEvent"("status", "createdAt");
