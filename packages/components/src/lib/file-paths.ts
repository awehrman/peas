/**
 * Folder-aware file helpers. Browsers expose a file's folder path through
 * `webkitRelativePath` (directory pickers) while `name` is only the base
 * name, so everything that groups files by folder should go through here.
 */

export function getFilePath(file: File): string {
  return file.webkitRelativePath || file.name;
}

/**
 * Attaches a folder path to a file created from a drop or an archive, so
 * `getFilePath` treats it like a file chosen with a directory picker.
 */
export function withRelativePath(file: File, relativePath: string): File {
  Object.defineProperty(file, "webkitRelativePath", {
    value: relativePath.replace(/^\/+/, ""),
    configurable: true,
  });
  return file;
}

function readFileEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file((file) => resolve(withRelativePath(file, entry.fullPath)), reject);
  });
}

async function readDirectoryEntries(
  directory: FileSystemDirectoryEntry
): Promise<FileSystemEntry[]> {
  const reader = directory.createReader();
  const entries: FileSystemEntry[] = [];

  // readEntries returns results in batches until it yields an empty array
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject)
    );
    if (batch.length === 0) return entries;
    entries.push(...batch);
  }
}

async function collectEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) return [await readFileEntry(entry as FileSystemFileEntry)];
  if (!entry.isDirectory) return [];

  const children = await readDirectoryEntries(entry as FileSystemDirectoryEntry);
  const nested = await Promise.all(children.map(collectEntry));
  return nested.flat();
}

/**
 * Files from a drop, walking into dropped folders. Falls back to the flat
 * file list when the browser doesn't support entries.
 */
export async function collectDroppedFiles(dataTransfer: DataTransfer): Promise<File[]> {
  const entries = Array.from(dataTransfer.items ?? [])
    .map((item) => (item.kind === "file" ? item.webkitGetAsEntry?.() : null))
    .filter((entry): entry is FileSystemEntry => entry !== null && entry !== undefined);

  if (entries.length === 0) return Array.from(dataTransfer.files ?? []);

  const files = await Promise.all(entries.map(collectEntry));
  return files.flat();
}
