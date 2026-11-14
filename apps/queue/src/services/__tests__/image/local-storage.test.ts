import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getLocalImageDir,
  getLocalImageRoot,
  getLocalImageUrl,
} from "../../image/local-storage";

describe("local image storage", () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv, LOCAL_IMAGE_DIR: "/srv/media", PORT: "4200" };
    delete process.env.IMAGE_BASE_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("defaults the root to uploads/media in the working directory", () => {
    delete process.env.LOCAL_IMAGE_DIR;

    expect(getLocalImageRoot()).toBe(
      path.join(process.cwd(), "uploads", "media")
    );
  });

  it("keeps import directories inside the root", () => {
    expect(getLocalImageDir("import_123_abc")).toBe("/srv/media/import_123_abc");
    expect(getLocalImageDir("../../etc")).toBe("/srv/media/______etc");
    expect(getLocalImageDir("")).toBe("/srv/media/unknown");
  });

  it("builds an encoded localhost URL by default", () => {
    expect(getLocalImageUrl("/srv/media/import_1/My Photo@2x-original.png")).toBe(
      "http://localhost:4200/media/images/import_1/My%20Photo%402x-original.png"
    );
  });

  it("uses IMAGE_BASE_URL without doubling slashes", () => {
    process.env.IMAGE_BASE_URL = "https://queue.example.com/media/images/";

    expect(getLocalImageUrl("/srv/media/import_1/a.jpg")).toBe(
      "https://queue.example.com/media/images/import_1/a.jpg"
    );
  });

  it("rejects files outside the root", () => {
    expect(() => getLocalImageUrl("/srv/other/a.jpg")).toThrow(
      "Image is outside local image storage: /srv/other/a.jpg"
    );
    expect(() => getLocalImageUrl("/srv/media")).toThrow();
    expect(() => getLocalImageUrl("")).toThrow();
  });
});
