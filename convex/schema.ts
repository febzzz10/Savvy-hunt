import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const eventStatusValidator = v.union(
  v.literal("upcoming"),
  v.literal("live"),
  v.literal("paused"),
  v.literal("postponed"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export const publicationStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

export const resultStatusValidator = v.union(
  v.literal("not_ready"),
  v.literal("provisional"),
  v.literal("final"),
);

export const scoreStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("voided"),
);

export const galleryStatusValidator = v.union(
  v.literal("pending_review"),
  v.literal("published"),
  v.literal("hidden"),
  v.literal("unavailable"),
  v.literal("sync_error"),
);

export const syncRunStatusValidator = v.union(
  v.literal("running"),
  v.literal("success"),
  v.literal("partial"),
  v.literal("failed"),
);

export default defineSchema({
  admins: defineTable({
    authSubject: v.string(),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    role: v.union(v.literal("admin")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
  })
    .index("by_auth_subject", ["authSubject"])
    .index("by_active", ["isActive"]),

  schools: defineTable({
    name: v.string(),
    slug: v.string(),
    isActive: v.boolean(),
    displayOrder: v.number(),
    logoStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.string(),
    updatedBy: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_active_display_order", ["isActive", "displayOrder"]),

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    displayOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.string(),
    updatedBy: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_active_display_order", ["isActive", "displayOrder"]),

  events: defineTable({
    name: v.string(),
    categoryId: v.id("categories"),
    description: v.optional(v.string()),
    venue: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    status: eventStatusValidator,
    publicationStatus: publicationStatusValidator,
    resultStatus: resultStatusValidator,
    resultsPublishedAt: v.optional(v.number()),
    resultsFinalizedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.string(),
    updatedBy: v.string(),
  })
    .index("by_category", ["categoryId"])
    .index("by_category_publication", ["categoryId", "publicationStatus"])
    .index("by_status_start", ["status", "startsAt"])
    .index("by_publication_start", ["publicationStatus", "startsAt"])
    .index("by_publication_result", ["publicationStatus", "resultStatus"]),

  scores: defineTable({
    eventId: v.id("events"),
    schoolId: v.id("schools"),
    points: v.number(),
    status: scoreStatusValidator,
    note: v.optional(v.string()),
    revision: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.string(),
    updatedBy: v.string(),
  })
    .index("by_event", ["eventId"])
    .index("by_event_school", ["eventId", "schoolId"])
    .index("by_school", ["schoolId"])
    .index("by_status", ["status"]),

  auditLogs: defineTable({
    entityType: v.union(
      v.literal("school"),
      v.literal("category"),
      v.literal("event"),
      v.literal("score"),
      v.literal("galleryItem"),
      v.literal("admin"),
      v.literal("settings"),
    ),
    entityId: v.string(),
    action: v.string(),
    actorSubject: v.string(),
    reason: v.optional(v.string()),
    oldPoints: v.optional(v.number()),
    newPoints: v.optional(v.number()),
    oldStatus: v.optional(v.string()),
    newStatus: v.optional(v.string()),
    detail: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_entity_time", ["entityType", "createdAt"])
    .index("by_actor_time", ["actorSubject", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  galleryItems: defineTable({
    driveFileId: v.string(),
    driveFolderId: v.string(),
    driveName: v.string(),
    mimeType: v.string(),
    driveModifiedTime: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
    caption: v.optional(v.string()),
    altText: v.optional(v.string()),
    eventId: v.optional(v.id("events")),
    categoryId: v.optional(v.id("categories")),
    status: galleryStatusValidator,
    displayOrder: v.optional(v.number()),
    lastSyncedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    syncErrorCode: v.optional(v.string()),
  })
    .index("by_drive_file", ["driveFileId"])
    .index("by_drive_folder", ["driveFolderId"])
    .index("by_status", ["status"])
    .index("by_status_published_at", ["status", "publishedAt"])
    .index("by_status_category_published_at", ["status", "categoryId", "publishedAt"])
    .index("by_status_updated_at", ["status", "updatedAt"])
    .index("by_event", ["eventId"])
    .index("by_category", ["categoryId"]),

  driveSyncRuns: defineTable({
    trigger: v.union(v.literal("scheduled"), v.literal("manual")),
    status: syncRunStatusValidator,
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    filesSeen: v.number(),
    filesAdded: v.number(),
    filesUpdated: v.number(),
    filesSkipped: v.number(),
    filesFailed: v.number(),
    safeErrorSummary: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  })
    .index("by_started_at", ["startedAt"])
    .index("by_status_started_at", ["status", "startedAt"]),

  appSettings: defineTable({
    key: v.string(),
    eventTimezone: v.optional(v.string()),
    minimumPoints: v.optional(v.number()),
    maximumPoints: v.optional(v.number()),
    allowDecimalPoints: v.optional(v.boolean()),
    showZeroScoreSchools: v.optional(v.boolean()),
    provisionalResultsPublic: v.optional(v.boolean()),
    galleryRequiresReview: v.optional(v.boolean()),
    maxGalleryFileBytes: v.optional(v.number()),
    driveFolderId: v.optional(v.string()),
    updatedAt: v.number(),
    updatedBy: v.string(),
  }).index("by_key", ["key"]),
});
