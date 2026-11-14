import { withRelativePath } from "@peas/components/lib/file-paths";
import { type Unzipped, unzip } from "fflate";

const ZIP_FILE = /\.zip$/i;

const MIME_BY_EXTENSION: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
};

export function isZipFile(file: File): boolean {
  return ZIP_FILE.test(file.name) || file.type === "application/zip";
}

/** macOS adds resource forks and Finder metadata to zips; skip them. */
function isArchiveJunk(path: string): boolean {
  return path.split("/").some((part) => part === "__MACOSX" || part === ".DS_Store" || part.startsWith("._"));
}

function mimeTypeFor(fileName: string): string {
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : undefined;
  return (extension && MIME_BY_EXTENSION[extension]) || "";
}

function unzipAsync(data: Uint8Array): Promise<Unzipped> {
  return new Promise((resolve, reject) => {
    unzip(data, (error, result) => (error ? reject(error) : resolve(result)));
  });
}

/**
 * Turns a zipped Evernote export into File objects that keep their folder
 * paths, so they group exactly like a chosen or dropped folder.
 */
export async function extractZipFile(zip: File): Promise<File[]> {
  const entries = await unzipAsync(new Uint8Array(await zip.arrayBuffer()));

  return Object.entries(entries)
    .filter(([path]) => !path.endsWith("/") && !isArchiveJunk(path))
    .map(([path, data]) => {
      const fileName = path.split("/").pop() ?? path;
      const file = new File([data], fileName, { type: mimeTypeFor(fileName) });
      return withRelativePath(file, path);
    });
}

/**
 * Replaces any .zip files in a selection with their contents.
 */
export async function expandArchives(files: File[]): Promise<File[]> {
  const expanded = await Promise.all(
    files.map((file) => (isZipFile(file) ? extractZipFile(file) : Promise.resolve([file])))
  );
  return expanded.flat();
}
