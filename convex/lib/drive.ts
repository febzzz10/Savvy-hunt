export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const DEFAULT_MAX_GALLERY_FILE_BYTES = 15 * 1024 * 1024;

export type DriveFile = {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
  modifiedTime?: string;
  trashed?: boolean;
  parents?: string[];
};

export type DriveFileValidation = { ok: true } | { ok: false; code: string; message: string };

export function validateDriveImageFile(
  file: DriveFile,
  maxBytes: number,
  folderId: string,
): DriveFileValidation {
  if (!file.id || file.id.trim().length === 0) {
    return { ok: false, code: "MISSING_FILE_ID", message: "Drive file has no id." };
  }
  if (file.trashed) {
    return { ok: false, code: "TRASHED", message: "Drive file is in the trash." };
  }
  if (file.parents && folderId && !file.parents.includes(folderId)) {
    return {
      ok: false,
      code: "OUTSIDE_FOLDER",
      message: "Drive file is not in the configured folder.",
    };
  }
  if (!file.mimeType || !ALLOWED_IMAGE_MIME_TYPES.includes(file.mimeType as never)) {
    return {
      ok: false,
      code: "UNSUPPORTED_MIME_TYPE",
      message: "Only JPEG, PNG, and WebP images can be imported.",
    };
  }
  const size = parseDriveSize(file.size);
  if (size === null || size <= 0) {
    return { ok: false, code: "INVALID_SIZE", message: "Drive file size is missing or invalid." };
  }
  if (size > maxBytes) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: `Image exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB limit.`,
    };
  }
  return { ok: true };
}

export function parseDriveSize(size: string | undefined): number | null {
  if (size === undefined || size.trim() === "") return null;
  const parsed = Number(size);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

export function normalizeDriveFileName(name: string | undefined, fallback: string): string {
  const trimmed = name?.trim().replace(/\s+/g, " ");
  if (!trimmed) return fallback;
  return trimmed.slice(0, 200);
}

export function classifyDriveHttpError(status: number): string {
  if (status === 401) return "DRIVE_AUTH_FAILED";
  if (status === 403) return "DRIVE_PERMISSION_DENIED";
  if (status === 404) return "DRIVE_FILE_NOT_FOUND";
  if (status === 429) return "DRIVE_RATE_LIMITED";
  if (status >= 500) return "DRIVE_UPSTREAM_ERROR";
  return "DRIVE_REQUEST_FAILED";
}

export function isRetryableDriveStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export type DriveConfigStatus = {
  configured: boolean;
  missing: string[];
  folderConfigured: boolean;
};

export function getDriveConfigStatus(env: {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  GOOGLE_DRIVE_FOLDER_ID?: string;
}): DriveConfigStatus {
  const missing: string[] = [];
  if (!env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
  if (!env.GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
  if (!env.GOOGLE_REFRESH_TOKEN) missing.push("GOOGLE_REFRESH_TOKEN");
  return {
    configured: missing.length === 0,
    missing,
    folderConfigured: Boolean(env.GOOGLE_DRIVE_FOLDER_ID),
  };
}

export function buildDriveListUrl(folderId: string, pageToken: string | undefined, pageSize: number): string {
  const params = new URLSearchParams({
    q: `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`,
    fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,trashed,parents)",
    pageSize: String(pageSize),
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  if (pageToken) params.set("pageToken", pageToken);
  return `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
}

export function buildDriveDownloadUrl(fileId: string): string {
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId,
  )}?alt=media&supportsAllDrives=true`;
}

export function parseDriveFileList(payload: unknown): {
  files: DriveFile[];
  nextPageToken?: string;
} {
  if (!payload || typeof payload !== "object") return { files: [] };
  const record = payload as { files?: unknown; nextPageToken?: unknown };
  const files = Array.isArray(record.files)
    ? (record.files as DriveFile[]).filter(
        (file) => file && typeof file.id === "string" && file.id.length > 0,
      )
    : [];
  const nextPageToken =
    typeof record.nextPageToken === "string" && record.nextPageToken.length > 0
      ? record.nextPageToken
      : undefined;
  return { files, nextPageToken };
}

export function sanitizeSyncError(code: string | undefined): string {
  if (!code) return "DRIVE_SYNC_FAILED";
  const safe = code.toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 60);
  return safe || "DRIVE_SYNC_FAILED";
}
