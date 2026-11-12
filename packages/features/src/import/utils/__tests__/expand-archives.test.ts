// @vitest-environment node
import { File as NodeFile } from "node:buffer";

import { getFilePath } from "@peas/components/lib/file-paths";
import { strToU8, zipSync } from "fflate";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { expandArchives, extractZipFile, isZipFile } from "../expand-archives";

// The shared test setup mocks File without real bytes; zips need the real one
const mockedFile = globalThis.File;
beforeAll(() => {
  globalThis.File = NodeFile as unknown as typeof File;
});
afterAll(() => {
  globalThis.File = mockedFile;
});

function makeZip(entries: Record<string, string>): File {
  const zipped = zipSync(
    Object.fromEntries(Object.entries(entries).map(([path, body]) => [path, strToU8(body)]))
  );
  return new File([zipped], "venison-20240901.zip", { type: "application/zip" });
}

describe("expandArchives", () => {
  it("unpacks a zipped export, keeping folder paths and guessing MIME types", async () => {
    const files = await extractZipFile(
      makeZip({
        "Venison/Venison Hot Pot.html": "<html></html>",
        "Venison/Venison Hot Pot files/shot.png": "png",
        "Venison/Fallow Deer Loin files/Evernote": "binary",
      })
    );

    expect(files.map((file) => [getFilePath(file), file.name, file.type])).toEqual([
      ["Venison/Venison Hot Pot.html", "Venison Hot Pot.html", "text/html"],
      ["Venison/Venison Hot Pot files/shot.png", "shot.png", "image/png"],
      ["Venison/Fallow Deer Loin files/Evernote", "Evernote", ""],
    ]);
  });

  it("drops macOS archive metadata", async () => {
    const files = await extractZipFile(
      makeZip({
        "Venison/Stew.html": "<html></html>",
        "__MACOSX/Venison/._Stew.html": "fork",
        "Venison/.DS_Store": "finder",
      })
    );

    expect(files.map(getFilePath)).toEqual(["Venison/Stew.html"]);
  });

  it("passes non-zip files through unchanged", async () => {
    const html = new File(["<html></html>"], "Stew.html", { type: "text/html" });
    const files = await expandArchives([html, makeZip({ "A.html": "<html></html>" })]);

    expect(files[0]).toBe(html);
    expect(files.map(getFilePath)).toEqual(["Stew.html", "A.html"]);
    expect(isZipFile(html)).toBe(false);
  });
});
