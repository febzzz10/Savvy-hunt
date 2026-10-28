import { v } from "convex/values";
import type { ActionCtx } from "./_generated/server";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { appError } from "./lib/auth";
import { getAppSettings } from "./lib/settings";
import {
  buildDriveDownloadUrl,
  buildDriveListUrl,
  classifyDriveHttpError,
  DEFAULT_MAX_GALLERY_FILE_BYTES,
  getDriveConfigStatus,
  isRetryableDriveStatus,
  normalizeDriveFileName,
  parseDriveFileList,
  parseDriveSize,
  sanitizeSyncError,
  validateDriveImageFile,
  type DriveFile,
} from "./lib/drive";

const SYNC_ACTOR = "system:drive-sync";
const STALE_RUN_MS = 10 * 60 * 1000;

class DriveSyncFailure extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export const beginSyncRun = internalMutation({
  args: {
    trigger: v.union(v.literal("scheduled"), v.literal("manual")),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const running = await ctx.db
      .query("driveSyncRuns")
      .withIndex("by_status_started_at", (q) => q.eq("status", "running"))
      .order("desc")
      .first();

    const now = Date.now();
    if (running) {
      if (now - running.startedAt < STALE_RUN_MS) {
        throw appError("ALREADY_RUNNING", "A gallery sync is already running.");
      }
      await ctx.db.patch(running._id, {
        status: "failed",
        finishedAt: now,
        safeErrorSummary: "STALE_RUN",
      });
    }

    return await ctx.db.insert("driveSyncRuns", {
      trigger: args.trigger,
      status: "running",
      startedAt: now,
      filesSeen: 0,
      filesAdded: 0,
      filesUpdated: 0,
      filesSkipped: 0,
      filesFailed: 0,
      createdBy: args.createdBy,
    });
  },
});

export const finishSyncRun = internalMutation({
  args: {
    runId: v.id("driveSyncRuns"),
    status: v.union(
      v.literal("success"),
      v.literal("partial"),
      v.literal("failed"),
    ),
    filesSeen: v.number(),
    filesAdded: v.number(),
    filesUpdated: v.number(),
    filesSkipped: v.number(),
    filesFailed: v.number(),
    safeErrorSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: args.status,
      finishedAt: Date.now(),
      filesSeen: args.filesSeen,
      filesAdded: args.filesAdded,
      filesUpdated: args.filesUpdated,
      filesSkipped: args.filesSkipped,
      filesFailed: args.filesFailed,
      safeErrorSummary: args.safeErrorSummary
        ? sanitizeSyncError(args.safeErrorSummary)
        : undefined,
    });
  },
});

export const getSyncContext = internalQuery({
  args: {},
  handler: async (ctx) => {
    const settings = await getAppSettings(ctx);
    const folderId = settings.driveFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      throw appError("DRIVE_NOT_CONFIGURED", "Set the Google Drive folder before syncing.");
    }
    const items = await ctx.db
      .query("galleryItems")
      .withIndex("by_drive_folder", (q) => q.eq("driveFolderId", folderId))
      .collect();
    return {
      folderId,
      maxGalleryFileBytes: settings.maxGalleryFileBytes ?? DEFAULT_MAX_GALLERY_FILE_BYTES,
      galleryRequiresReview: settings.galleryRequiresReview,
      items: items.map((item) => ({
        driveFileId: item.driveFileId,
        driveModifiedTime: item.driveModifiedTime ?? null,
        sizeBytes: item.sizeBytes ?? null,
        storageId: item.storageId ?? null,
        status: item.status,
      })),
    };
  },
});

export const applyDriveFile = internalMutation({
  args: {
    driveFileId: v.string(),
    driveFolderId: v.string(),
    driveName: v.string(),
    mimeType: v.string(),
    driveModifiedTime: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    storageId: v.id("_storage"),
    autoPublish: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("galleryItems")
      .withIndex("by_drive_file", (q) => q.eq("driveFileId", args.driveFileId))
      .first();
    const now = Date.now();
    const status = args.autoPublish ? "published" : "pending_review";

    if (!existing) {
      const galleryItemId = await ctx.db.insert("galleryItems", {
        driveFileId: args.driveFileId,
        driveFolderId: args.driveFolderId,
        driveName: args.driveName,
        mimeType: args.mimeType,
        driveModifiedTime: args.driveModifiedTime,
        sizeBytes: args.sizeBytes,
        storageId: args.storageId,
        status,
        publishedAt: args.autoPublish ? now : undefined,
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("auditLogs", {
        entityType: "galleryItem",
        entityId: galleryItemId,
        action: "drive_add",
        actorSubject: SYNC_ACTOR,
        newStatus: status,
        detail: args.driveName,
        createdAt: now,
      });
      return { galleryItemId, action: "added" as const };
    }

    if (
      existing.driveModifiedTime === args.driveModifiedTime &&
      existing.sizeBytes === args.sizeBytes &&
      existing.storageId
    ) {
      return { galleryItemId: existing._id, action: "unchanged" as const };
    }

    const nextStatus =
      existing.status === "hidden"
        ? "hidden"
        : args.autoPublish || existing.status === "published"
          ? "published"
          : "pending_review";
    const nextPublishedAt =
      nextStatus === "published" ? existing.publishedAt ?? now : undefined;

    if (existing.storageId && existing.storageId !== args.storageId) {
      await ctx.storage.delete(existing.storageId);
    }

    await ctx.db.patch(existing._id, {
      driveFolderId: args.driveFolderId,
      driveName: args.driveName,
      mimeType: args.mimeType,
      driveModifiedTime: args.driveModifiedTime,
      sizeBytes: args.sizeBytes,
      storageId: args.storageId,
      status: nextStatus,
      publishedAt: nextPublishedAt,
      lastSyncedAt: now,
      syncErrorCode: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("auditLogs", {
      entityType: "galleryItem",
      entityId: existing._id,
      action: "drive_update",
      actorSubject: SYNC_ACTOR,
      oldStatus: existing.status,
      newStatus: nextStatus,
      detail: args.driveName,
      createdAt: now,
    });
    return { galleryItemId: existing._id, action: "updated" as const };
  },
});

export const markDriveItemError = internalMutation({
  args: {
    driveFileId: v.string(),
    driveFolderId: v.string(),
    driveName: v.string(),
    mimeType: v.string(),
    driveModifiedTime: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    errorCode: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("galleryItems")
      .withIndex("by_drive_file", (q) => q.eq("driveFileId", args.driveFileId))
      .first();
    const now = Date.now();
    const errorCode = sanitizeSyncError(args.errorCode);

    if (!existing) {
      await ctx.db.insert("galleryItems", {
        driveFileId: args.driveFileId,
        driveFolderId: args.driveFolderId,
        driveName: args.driveName,
        mimeType: args.mimeType,
        driveModifiedTime: args.driveModifiedTime,
        sizeBytes: args.sizeBytes,
        status: "sync_error",
        syncErrorCode: errorCode,
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      return;
    }

    await ctx.db.patch(existing._id, {
      driveName: args.driveName,
      mimeType: args.mimeType,
      driveModifiedTime: args.driveModifiedTime,
      sizeBytes: args.sizeBytes,
      status: "sync_error",
      syncErrorCode: errorCode,
      lastSyncedAt: now,
      updatedAt: now,
    });
  },
});

export const reconcileMissing = internalMutation({
  args: {
    driveFolderId: v.string(),
    seenDriveFileIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const seen = new Set(args.seenDriveFileIds);
    const items = await ctx.db
      .query("galleryItems")
      .withIndex("by_drive_folder", (q) => q.eq("driveFolderId", args.driveFolderId))
      .collect();
    const now = Date.now();
    let marked = 0;
    for (const item of items) {
      if (seen.has(item.driveFileId)) continue;
      if (item.status === "unavailable") continue;
      await ctx.db.patch(item._id, {
        status: "unavailable",
        updatedAt: now,
      });
      await ctx.db.insert("auditLogs", {
        entityType: "galleryItem",
        entityId: item._id,
        action: "drive_missing",
        actorSubject: SYNC_ACTOR,
        oldStatus: item.status,
        newStatus: "unavailable",
        detail: item.driveName,
        createdAt: now,
      });
      marked += 1;
    }
    return marked;
  },
});

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new DriveSyncFailure("DRIVE_NOT_CONFIGURED");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!response.ok) {
    throw new DriveSyncFailure(
      response.status === 400 || response.status === 401
        ? "DRIVE_AUTH_FAILED"
        : classifyDriveHttpError(response.status),
    );
  }

  const payload = (await response.json()) as { access_token?: unknown };
  if (typeof payload.access_token !== "string" || !payload.access_token) {
    throw new DriveSyncFailure("DRIVE_AUTH_FAILED");
  }
  return payload.access_token;
}

async function listDriveImages(
  folderId: string,
  accessToken: string,
): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 10; page += 1) {
    const response = await fetch(buildDriveListUrl(folderId, pageToken, 100), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new DriveSyncFailure(classifyDriveHttpError(response.status));
    }
    const parsed = parseDriveFileList(await response.json());
    files.push(...parsed.files);
    pageToken = parsed.nextPageToken;
    if (!pageToken) return files;
  }
  // ponytail: 1,000-file ceiling per sync; add incremental cursors if the folder grows.
  return files;
}

async function downloadDriveFile(
  fileId: string,
  accessToken: string,
): Promise<Blob> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(buildDriveDownloadUrl(fileId), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.ok) return await response.blob();
    lastStatus = response.status;
    if (!isRetryableDriveStatus(response.status)) break;
  }
  throw new DriveSyncFailure(classifyDriveHttpError(lastStatus));
}

async function runSync(
  ctx: ActionCtx,
  trigger: "scheduled" | "manual",
  actorSubject: string | null,
): Promise<{
  runId: Id<"driveSyncRuns">;
  status: "failed" | "partial" | "success";
  filesSeen: number;
  filesAdded: number;
  filesUpdated: number;
  filesSkipped: number;
  filesFailed: number;
  markedUnavailable: number;
}> {
  const syncContext: {
    folderId: string;
    maxGalleryFileBytes: number;
    galleryRequiresReview: boolean;
    items: Array<{
      driveFileId: string;
      driveModifiedTime: string | null;
      sizeBytes: number | null;
      storageId: string | null;
      status: string;
    }>;
  } = await ctx.runQuery(internal.drive.getSyncContext, {});

  const config = getDriveConfigStatus({
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
    GOOGLE_DRIVE_FOLDER_ID: syncContext.folderId,
  });
  if (!config.configured) {
    throw appError(
      "DRIVE_NOT_CONFIGURED",
      `Google Drive is not configured. Missing: ${config.missing.join(", ")}.`,
    );
  }

  const runId: Id<"driveSyncRuns"> = await ctx.runMutation(internal.drive.beginSyncRun, {
    trigger,
    createdBy: actorSubject ?? SYNC_ACTOR,
  });

  const counts = {
    filesSeen: 0,
    filesAdded: 0,
    filesUpdated: 0,
    filesSkipped: 0,
    filesFailed: 0,
  };
  const seenIds: string[] = [];
  const existing = new Map(syncContext.items.map((item) => [item.driveFileId, item]));

  let accessToken: string;
  let driveFiles: DriveFile[];
  try {
    accessToken = await getAccessToken();
    driveFiles = await listDriveImages(syncContext.folderId, accessToken);
  } catch (error) {
    const code = error instanceof DriveSyncFailure ? error.code : "DRIVE_SYNC_FAILED";
    await ctx.runMutation(internal.drive.finishSyncRun, {
      runId,
      status: "failed",
      ...counts,
      safeErrorSummary: code,
    });
    throw appError("DRIVE_SYNC_FAILED", `Google Drive sync failed (${code}).`);
  }

  for (const file of driveFiles) {
    counts.filesSeen += 1;
    if (file.id) seenIds.push(file.id);
    const metadata = {
      driveFileId: file.id ?? "",
      driveFolderId: syncContext.folderId,
      driveName: normalizeDriveFileName(file.name, file.id ?? "Drive image"),
      mimeType: file.mimeType ?? "application/octet-stream",
      driveModifiedTime: file.modifiedTime,
      sizeBytes: parseDriveSize(file.size) ?? undefined,
    };

    const validation = validateDriveImageFile(
      file,
      syncContext.maxGalleryFileBytes,
      syncContext.folderId,
    );
    if (!validation.ok) {
      counts.filesFailed += 1;
      if (metadata.driveFileId) {
        await ctx.runMutation(internal.drive.markDriveItemError, {
          ...metadata,
          errorCode: validation.code,
        });
      }
      continue;
    }

    const prior = existing.get(metadata.driveFileId);
    const priorSize = prior?.sizeBytes ?? null;
    const nextSize = parseDriveSize(file.size);
    if (
      prior &&
      prior.storageId &&
      prior.driveModifiedTime === (file.modifiedTime ?? null) &&
      priorSize === nextSize
    ) {
      counts.filesSkipped += 1;
      continue;
    }

    try {
      const blob = await downloadDriveFile(metadata.driveFileId, accessToken);
      if (blob.size > syncContext.maxGalleryFileBytes) {
        throw new DriveSyncFailure("FILE_TOO_LARGE");
      }
      const storageId: Id<"_storage"> = await ctx.storage.store(blob);
      const result: { action: "added" | "updated" | "unchanged" } = await ctx.runMutation(
        internal.drive.applyDriveFile,
        {
          ...metadata,
          sizeBytes: blob.size,
          storageId,
          autoPublish: !syncContext.galleryRequiresReview,
        },
      );
      if (result.action === "added") counts.filesAdded += 1;
      else if (result.action === "updated") counts.filesUpdated += 1;
      else counts.filesSkipped += 1;
    } catch (error) {
      counts.filesFailed += 1;
      const code = error instanceof DriveSyncFailure ? error.code : "DRIVE_SYNC_FAILED";
      await ctx.runMutation(internal.drive.markDriveItemError, {
        ...metadata,
        errorCode: code,
      });
    }
  }

  const reconciled: number = await ctx.runMutation(internal.drive.reconcileMissing, {
    driveFolderId: syncContext.folderId,
    seenDriveFileIds: seenIds,
  });

  const succeeded = counts.filesAdded + counts.filesUpdated;
  const status =
    counts.filesFailed > 0 && succeeded === 0
      ? "failed"
      : counts.filesFailed > 0
        ? "partial"
        : "success";

  await ctx.runMutation(internal.drive.finishSyncRun, {
    runId,
    status,
    ...counts,
    safeErrorSummary:
      counts.filesFailed > 0 ? `${counts.filesFailed}_FILES_FAILED` : undefined,
  });

  return {
    runId,
    status,
    ...counts,
    markedUnavailable: reconciled,
  };
}

export const syncNow = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw appError("UNAUTHENTICATED", "Sign in with an authorized admin account to sync.");
    }
    await ctx.runQuery(internal.auth.adminBySubject, { authSubject: identity.subject });
    return await runSync(ctx, "manual", identity.subject);
  },
});

export const syncScheduled = internalAction({
  args: {},
  handler: async (ctx) => {
    return await runSync(ctx, "scheduled", null);
  },
});
