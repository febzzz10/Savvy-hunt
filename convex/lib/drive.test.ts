import { describe, expect, it } from "vitest";
import {
  buildDriveDownloadUrl,
  buildDriveListUrl,
  classifyDriveHttpError,
  getDriveConfigStatus,
  isRetryableDriveStatus,
  normalizeDriveFileName,
  parseDriveFileList,
  parseDriveSize,
  sanitizeSyncError,
  validateDriveImageFile,
} from "./drive";

const folderId = "folder_123";
const maxBytes = 15 * 1024 * 1024;

describe("validateDriveImageFile", () => {
  it("accepts a supported image in the right folder", () => {
    expect(
      validateDriveImageFile(
        {
          id: "file_1",
          name: "photo.jpg",
          mimeType: "image/jpeg",
          size: "2048",
          parents: [folderId],
        },
        maxBytes,
        folderId,
      ),
    ).toEqual({ ok: true });
  });

  it("rejects missing ids, trashed files, and files from other folders", () => {
    const base = {
      id: "file_1",
      mimeType: "image/png",
      size: "2048",
      parents: [folderId],
    };
    expect(validateDriveImageFile({ ...base, id: "" }, maxBytes, folderId)).toMatchObject({
      code: "MISSING_FILE_ID",
    });
    expect(validateDriveImageFile({ ...base, trashed: true }, maxBytes, folderId)).toMatchObject({
      code: "TRASHED",
    });
    expect(
      validateDriveImageFile({ ...base, parents: ["other"] }, maxBytes, folderId),
    ).toMatchObject({ code: "OUTSIDE_FOLDER" });
  });

  it("rejects unsupported types, missing sizes, and oversized files", () => {
    expect(
      validateDriveImageFile(
        { id: "f", mimeType: "image/gif", size: "10", parents: [folderId] },
        maxBytes,
        folderId,
      ),
    ).toMatchObject({ code: "UNSUPPORTED_MIME_TYPE" });
    expect(
      validateDriveImageFile(
        { id: "f", mimeType: "image/png", parents: [folderId] },
        maxBytes,
        folderId,
      ),
    ).toMatchObject({ code: "INVALID_SIZE" });
    expect(
      validateDriveImageFile(
        { id: "f", mimeType: "image/png", size: String(maxBytes + 1), parents: [folderId] },
        maxBytes,
        folderId,
      ),
    ).toMatchObject({ code: "FILE_TOO_LARGE" });
  });
});

describe("Drive helpers", () => {
  it("parses sizes defensively", () => {
    expect(parseDriveSize("1024")).toBe(1024);
    expect(parseDriveSize("10.9")).toBe(10);
    expect(parseDriveSize(undefined)).toBeNull();
    expect(parseDriveSize("-2")).toBeNull();
    expect(parseDriveSize("abc")).toBeNull();
  });

  it("normalizes names and escapes folder ids in query URLs", () => {
    expect(normalizeDriveFileName("  a   b  ", "fallback")).toBe("a b");
    expect(normalizeDriveFileName("", "fallback")).toBe("fallback");
    const url = buildDriveListUrl("a'b", undefined, 1000);
    expect(url).toContain("a%5C%27b");
    expect(buildDriveDownloadUrl("file/1")).toContain("file%2F1");
  });

  it("classifies HTTP statuses and retry behaviour", () => {
    expect(classifyDriveHttpError(401)).toBe("DRIVE_AUTH_FAILED");
    expect(classifyDriveHttpError(403)).toBe("DRIVE_PERMISSION_DENIED");
    expect(classifyDriveHttpError(404)).toBe("DRIVE_FILE_NOT_FOUND");
    expect(classifyDriveHttpError(429)).toBe("DRIVE_RATE_LIMITED");
    expect(classifyDriveHttpError(503)).toBe("DRIVE_UPSTREAM_ERROR");
    expect(isRetryableDriveStatus(429)).toBe(true);
    expect(isRetryableDriveStatus(500)).toBe(true);
    expect(isRetryableDriveStatus(404)).toBe(false);
  });

  it("parses file lists and drops malformed entries", () => {
    expect(
      parseDriveFileList({
        files: [{ id: "1", name: "a.jpg", mimeType: "image/jpeg" }, { name: "no-id" }],
        nextPageToken: "next",
      }),
    ).toEqual({
      files: [{ id: "1", name: "a.jpg", mimeType: "image/jpeg" }],
      nextPageToken: "next",
    });
    expect(parseDriveFileList(null)).toEqual({ files: [] });
  });

  it("reports missing credential names and sanitizes errors", () => {
    expect(
      getDriveConfigStatus({
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "secret",
        GOOGLE_REFRESH_TOKEN: undefined,
        GOOGLE_DRIVE_FOLDER_ID: undefined,
      }),
    ).toEqual({
      configured: false,
      missing: ["GOOGLE_REFRESH_TOKEN"],
      folderConfigured: false,
    });
    expect(sanitizeSyncError("DRIVE_AUTH_FAILED")).toBe("DRIVE_AUTH_FAILED");
    expect(sanitizeSyncError(undefined)).toBe("DRIVE_SYNC_FAILED");
    expect(sanitizeSyncError("bad code!")).toBe("BAD_CODE_");
  });
});
