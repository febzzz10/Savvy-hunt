import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { DEFAULT_POINT_POLICY, type PointPolicy } from "./scoring";

export const SETTINGS_KEY = "global";

export const DEFAULT_EVENT_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_MAX_GALLERY_FILE_BYTES = 15 * 1024 * 1024;

export type ResolvedSettings = {
  key: string;
  eventTimezone: string;
  minimumPoints: number;
  maximumPoints: number;
  allowDecimalPoints: boolean;
  showZeroScoreSchools: boolean;
  provisionalResultsPublic: boolean;
  galleryRequiresReview: boolean;
  maxGalleryFileBytes: number;
  driveFolderId?: string;
  updatedAt: number;
  updatedBy: string;
  pointPolicy: PointPolicy;
};

export async function getSettingsRow(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"appSettings"> | null> {
  return await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
    .first();
}

export async function getAppSettings(
  ctx: QueryCtx | MutationCtx,
): Promise<ResolvedSettings> {
  const row = await getSettingsRow(ctx);
  const minimumPoints = row?.minimumPoints ?? DEFAULT_POINT_POLICY.minimumPoints;
  const maximumPoints = row?.maximumPoints ?? DEFAULT_POINT_POLICY.maximumPoints;
  return {
    key: SETTINGS_KEY,
    eventTimezone: row?.eventTimezone ?? DEFAULT_EVENT_TIMEZONE,
    minimumPoints,
    maximumPoints,
    allowDecimalPoints: row?.allowDecimalPoints ?? DEFAULT_POINT_POLICY.allowDecimalPoints,
    showZeroScoreSchools: row?.showZeroScoreSchools ?? false,
    provisionalResultsPublic: row?.provisionalResultsPublic ?? true,
    galleryRequiresReview: row?.galleryRequiresReview ?? true,
    maxGalleryFileBytes: row?.maxGalleryFileBytes ?? DEFAULT_MAX_GALLERY_FILE_BYTES,
    driveFolderId: row?.driveFolderId,
    updatedAt: row?.updatedAt ?? 0,
    updatedBy: row?.updatedBy ?? "system",
    pointPolicy: {
      minimumPoints,
      maximumPoints,
      allowDecimalPoints: row?.allowDecimalPoints ?? DEFAULT_POINT_POLICY.allowDecimalPoints,
    },
  };
}
