import { withRelativePath } from "@peas/components/lib/file-paths";
import { describe, expect, it } from "vitest";

import { groupFilesByHtmlAndImages, validateFileList } from "../file-validation";

/** A File as a directory picker or drop would produce it: base name + folder path. */
function exportFile(path: string, type = ""): File {
  const fileName = path.split("/").pop() ?? path;
  return withRelativePath(new File(["x"], fileName, { type }), path);
}

function groupExport(paths: string[]) {
  const files = paths.map((path) =>
    exportFile(path, path.endsWith(".html") ? "text/html" : path.endsWith(".png") ? "image/png" : "")
  );
  const validated = validateFileList(files);
  if (!validated.success) throw new Error(validated.error.message);
  return groupFilesByHtmlAndImages(validated.data);
}

function imagesFor(result: ReturnType<typeof groupExport>, title: string): string[] {
  const group = result.groups.find((candidate) =>
    candidate.htmlFile.name.endsWith(`/${title}.html`)
  );
  return group ? group.imageFiles.map((image) => image.name) : [];
}

describe("grouping an Evernote export", () => {
  const exportPaths = [
    "venison-20240901/Venison/Venison Stew.html",
    "venison-20240901/Venison/Venison Stew with Nettle Dumplings.html",
    "venison-20240901/Venison/Venison Stew with Nettle Dumplings files/Evernote",
    "venison-20240901/Venison/Venison Hot Pot.html",
    "venison-20240901/Venison/Venison Hot Pot files/CleanShot 2022-02-20 at 10.22.08.png",
    "venison-20240901/Venison/Fallow Deer Loin.html",
    "venison-20240901/Venison/Fallow Deer Loin files/Evernote",
    "venison-20240901/Venison/.DS_Store",
  ];

  it("attaches each image folder only to its own note", () => {
    const result = groupExport(exportPaths);

    expect(result.isValid).toBe(true);
    expect(result.groups).toHaveLength(4);
    expect(imagesFor(result, "Venison Stew")).toEqual([]);
    expect(imagesFor(result, "Venison Stew with Nettle Dumplings")).toEqual([
      "venison-20240901/Venison/Venison Stew with Nettle Dumplings files/Evernote",
    ]);
    expect(imagesFor(result, "Venison Hot Pot")).toHaveLength(1);
    expect(imagesFor(result, "Fallow Deer Loin")).toEqual([
      "venison-20240901/Venison/Fallow Deer Loin files/Evernote",
    ]);
  });

  it("keeps same-named extensionless images as distinct files", () => {
    const files = [
      exportFile("Venison/A.html", "text/html"),
      exportFile("Venison/A files/Evernote"),
      exportFile("Venison/B.html", "text/html"),
      exportFile("Venison/B files/Evernote"),
    ];
    const validated = validateFileList(files);
    if (!validated.success) throw new Error("validation failed");

    expect(validated.data.map((item) => item.file)).toEqual(files);
  });

  it("matches folders regardless of Unicode normalization and case", () => {
    const result = groupExport([
      "Venison/Venison with Pepper Sauce and Celeriac Purée.html",
      "Venison/venison with pepper sauce and celeriac pure\u0301e files/photo.png",
    ]);

    expect(result.groups[0]?.imageFiles).toHaveLength(1);
  });

  it("skips stray images and Evernote index pages instead of failing the import", () => {
    const result = groupExport([
      "Venison/Venison Stew.html",
      "Venison/Evernote_index.html",
      "Venison/Unrelated files/photo.png",
      "Venison/Other/stray.png",
    ]);

    expect(result.isValid).toBe(true);
    expect(result.groups).toHaveLength(1);
    expect(result.ignoredFiles).toEqual([
      "Venison/Evernote_index.html",
      "Venison/Unrelated files/photo.png",
      "Venison/Other/stray.png",
    ]);
  });
});
