import { describe, expect, it } from "vitest";

import { formatMediaDuration, ITEM_MEDIA_LIMIT, mediaTypeForFile, validateMediaFile } from "./media";

function fileOf(type: string, size: number): File {
  return { type, size } as File;
}

describe("mediaTypeForFile", () => {
  it("recognizes supported images and videos", () => {
    expect(mediaTypeForFile(fileOf("image/jpeg", 1))).toBe("image");
    expect(mediaTypeForFile(fileOf("image/gif", 1))).toBe("image");
    expect(mediaTypeForFile(fileOf("video/mp4", 1))).toBe("video");
    expect(mediaTypeForFile(fileOf("video/webm", 1))).toBe("video");
  });

  it("rejects unsupported formats", () => {
    expect(mediaTypeForFile(fileOf("application/pdf", 1))).toBeNull();
    expect(mediaTypeForFile(fileOf("video/quicktime", 1))).toBeNull();
  });
});

describe("validateMediaFile", () => {
  it("enforces the gallery size limit", () => {
    expect(validateMediaFile(fileOf("image/jpeg", 1), ITEM_MEDIA_LIMIT)).toBe("count");
  });

  it("enforces per-type size limits", () => {
    expect(validateMediaFile(fileOf("image/jpeg", 26 * 1024 * 1024), 0)).toBe("size");
    expect(validateMediaFile(fileOf("video/mp4", 16 * 1024 * 1024), 0)).toBe("size");
    expect(validateMediaFile(fileOf("video/mp4", 15 * 1024 * 1024), 0)).toBeNull();
  });
});

describe("formatMediaDuration", () => {
  it("formats durations with a French decimal comma", () => {
    expect(formatMediaDuration(4_200)).toBe("4,2 s");
    expect(formatMediaDuration(null)).toBe("");
  });
});
