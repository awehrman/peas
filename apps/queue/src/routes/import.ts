import { Router } from "express";
import fs from "fs";
import path from "path";
import { noteQueue } from "../queues";

export const importRouter = Router();

const directoryPath = path.join(process.cwd(), "/public/files");
const EVERNOTE_INDEX_FILE = "Evernote_index.html";

async function enqueueHtmlFiles() {
  if (!fs.existsSync(directoryPath)) {
    throw new Error(`Directory ${directoryPath} does not exist`);
  }

  const files = fs.readdirSync(directoryPath);
  for (const file of files) {
    if (file.endsWith(".html") && file !== EVERNOTE_INDEX_FILE) {
      const filePath = path.join(directoryPath, file);
      const content = fs.readFileSync(filePath, "utf-8");
      await noteQueue.add("process-note", { content });
    }
  }
}

// Kick off import for all HTML files in the directory
importRouter.post("/", async (_req, res) => {
  try {
    await enqueueHtmlFiles();
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});
