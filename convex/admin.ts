import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  appError,
  optionalText,
  requireAdmin,
  requireText,
  writeAudit,
} from "./lib/auth";
import { getAppSettings, getSettingsRow, SETTINGS_KEY } from "./lib/settings";
import {
  galleryStatusValidator,
  eventStatusValidator,
  publicationStatusValidator,
  resultStatusValidator,
} from "./schema";
import {
  isAllowedEventTransition,
  isAllowedResultTransition,
  isRestrictedEventTransition,
  resultTransitionNeedsReason,
  slugify,
  validatePoints,
  type EventStatus,
  type ResultStatus,
} from "./lib/scoring";
import { getDriveConfigStatus } from "./lib/drive";

const PUBLICATION_TRANSITIONS: Record<string, string[]> = {
  draft: ["published"],
  published: ["draft", "archived"],
  archived: ["draft"],
};

async function getEventOrThrow(ctx: QueryCtx | MutationCtx, eventId: Id<"events">) {
  const event = await ctx.db.get(eventId);
  if (!event) throw appError("NOT_FOUND", "That event could not be found.");
  return event;
}

async function getCategoryOrThrow(ctx: QueryCtx | MutationCtx, categoryId: Id<"categories">) {
  const category = await ctx.db.get(categoryId);
  if (!category) throw appError("NOT_FOUND", "That category could not be found.");
  return category;
}

function validateDateRange(startsAt?: number, endsAt?: number): void {
  if (startsAt !== undefined && endsAt !== undefined && endsAt < startsAt) {
    throw appError("VALIDATION_ERROR", "End time cannot be before start time.");
  }
}

function requireReason(reason: string | undefined, message: string): string {
  const value = reason?.trim();
  if (!value) throw appError("VALIDATION_ERROR", message);
  return value;
}

export const adminDashboard = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [events, schools, categories, gallery, syncRuns, audit] = await Promise.all([
      ctx.db.query("events").collect(),
      ctx.db.query("schools").collect(),
      ctx.db.query("categories").collect(),
      ctx.db.query("galleryItems").collect(),
      ctx.db.query("driveSyncRuns").withIndex("by_started_at").order("desc").take(1),
      ctx.db.query("auditLogs").withIndex("by_created_at").order("desc").take(6),
    ]);

    return {
      events: {
        total: events.length,
        live: events.filter((event) => event.status === "live" || event.status === "paused").length,
        drafts: events.filter((event) => event.publicationStatus === "draft").length,
        awaitingResults: events.filter(
          (event) =>
            event.status === "completed" &&
            event.publicationStatus === "published" &&
            event.resultStatus !== "final",
        ).length,
      },
      schools: {
        total: schools.length,
        active: schools.filter((school) => school.isActive).length,
      },
      categories: {
        total: categories.length,
        active: categories.filter((category) => category.isActive).length,
      },
      gallery: {
        pending: gallery.filter((item) => item.status === "pending_review").length,
        published: gallery.filter((item) => item.status === "published").length,
        hidden: gallery.filter((item) => item.status === "hidden").length,
        failed: gallery.filter(
          (item) => item.status === "sync_error" || item.status === "unavailable",
        ).length,
      },
      lastSync: syncRuns[0] ?? null,
      recentAudit: audit,
    };
  },
});

export const listSchools = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const schools = await ctx.db.query("schools").collect();
    return schools.sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, "en"),
    );
  },
});

export const createSchool = mutation({
  args: { name: v.string(), displayOrder: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const name = requireText(args.name, "School name", 120);
    const slug = slugify(name);
    if (!slug) throw appError("VALIDATION_ERROR", "School name must contain letters or numbers.");
    const duplicate = await ctx.db
      .query("schools")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (duplicate) throw appError("ALREADY_EXISTS", "A school with that name already exists.");
    const now = Date.now();
    const schoolId = await ctx.db.insert("schools", {
      name,
      slug,
      isActive: true,
      displayOrder: args.displayOrder ?? 0,
      createdAt: now,
      updatedAt: now,
      createdBy: actorSubject,
      updatedBy: actorSubject,
    });
    await writeAudit(ctx, {
      entityType: "school",
      entityId: schoolId,
      action: "create",
      actorSubject,
      detail: name,
    });
    return schoolId;
  },
});

export const updateSchool = mutation({
  args: {
    schoolId: v.id("schools"),
    name: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const school = await ctx.db.get(args.schoolId);
    if (!school) throw appError("NOT_FOUND", "That school could not be found.");

    const patch: Partial<Doc<"schools">> = { updatedAt: Date.now(), updatedBy: actorSubject };
    if (args.name !== undefined) {
      const name = requireText(args.name, "School name", 120);
      const slug = slugify(name);
      if (!slug) throw appError("VALIDATION_ERROR", "School name must contain letters or numbers.");
      if (slug !== school.slug) {
        const duplicate = await ctx.db
          .query("schools")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .first();
        if (duplicate) throw appError("ALREADY_EXISTS", "A school with that name already exists.");
      }
      patch.name = name;
      patch.slug = slug;
    }
    if (args.displayOrder !== undefined) patch.displayOrder = args.displayOrder;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    await ctx.db.patch(args.schoolId, patch);
    await writeAudit(ctx, {
      entityType: "school",
      entityId: args.schoolId,
      action: "update",
      actorSubject,
      detail: args.name ?? undefined,
      oldStatus: school.isActive ? "active" : "inactive",
      newStatus: (args.isActive ?? school.isActive) ? "active" : "inactive",
    });
  },
});

export const archiveSchool = mutation({
  args: { schoolId: v.id("schools") },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const school = await ctx.db.get(args.schoolId);
    if (!school) throw appError("NOT_FOUND", "That school could not be found.");
    if (!school.isActive) return;
    await ctx.db.patch(args.schoolId, {
      isActive: false,
      updatedAt: Date.now(),
      updatedBy: actorSubject,
    });
    await writeAudit(ctx, {
      entityType: "school",
      entityId: args.schoolId,
      action: "archive",
      actorSubject,
      oldStatus: "active",
      newStatus: "inactive",
    });
  },
});

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const categories = await ctx.db.query("categories").collect();
    return categories.sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, "en"),
    );
  },
});

export const createCategory = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const name = requireText(args.name, "Category name", 120);
    const slug = slugify(name);
    if (!slug) throw appError("VALIDATION_ERROR", "Category name must contain letters or numbers.");
    const duplicate = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (duplicate) throw appError("ALREADY_EXISTS", "A category with that name already exists.");
    const now = Date.now();
    const categoryId = await ctx.db.insert("categories", {
      name,
      slug,
      description: optionalText(args.description),
      displayOrder: args.displayOrder ?? 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: actorSubject,
      updatedBy: actorSubject,
    });
    await writeAudit(ctx, {
      entityType: "category",
      entityId: categoryId,
      action: "create",
      actorSubject,
      detail: name,
    });
    return categoryId;
  },
});

export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw appError("NOT_FOUND", "That category could not be found.");

    const patch: Partial<Doc<"categories">> = { updatedAt: Date.now(), updatedBy: actorSubject };
    if (args.name !== undefined) {
      const name = requireText(args.name, "Category name", 120);
      const slug = slugify(name);
      if (!slug) throw appError("VALIDATION_ERROR", "Category name must contain letters or numbers.");
      if (slug !== category.slug) {
        const duplicate = await ctx.db
          .query("categories")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .first();
        if (duplicate) throw appError("ALREADY_EXISTS", "A category with that name already exists.");
      }
      patch.name = name;
      patch.slug = slug;
    }
    if (args.description !== undefined) patch.description = optionalText(args.description);
    if (args.displayOrder !== undefined) patch.displayOrder = args.displayOrder;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    await ctx.db.patch(args.categoryId, patch);
    await writeAudit(ctx, {
      entityType: "category",
      entityId: args.categoryId,
      action: "update",
      actorSubject,
      detail: args.name ?? undefined,
      oldStatus: category.isActive ? "active" : "inactive",
      newStatus: (args.isActive ?? category.isActive) ? "active" : "inactive",
    });
  },
});

export const archiveCategory = mutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw appError("NOT_FOUND", "That category could not be found.");
    if (!category.isActive) return;
    const activeEvents = await ctx.db
      .query("events")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();
    const blocking = activeEvents.filter(
      (event) => event.publicationStatus !== "archived" && event.status !== "cancelled",
    );
    if (blocking.length > 0) {
      throw appError(
        "INVALID_STATE_TRANSITION",
        "Archive or cancel this category's events before archiving the category.",
      );
    }
    await ctx.db.patch(args.categoryId, {
      isActive: false,
      updatedAt: Date.now(),
      updatedBy: actorSubject,
    });
    await writeAudit(ctx, {
      entityType: "category",
      entityId: args.categoryId,
      action: "archive",
      actorSubject,
      oldStatus: "active",
      newStatus: "inactive",
    });
  },
});

export const listEvents = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [events, categories] = await Promise.all([
      ctx.db.query("events").collect(),
      ctx.db.query("categories").collect(),
    ]);
    const categoryMap = new Map(categories.map((category) => [category._id, category]));
    return events
      .sort((a, b) => (b.startsAt ?? 0) - (a.startsAt ?? 0) || b.createdAt - a.createdAt)
      .map((event) => ({
        ...event,
        categoryName: categoryMap.get(event.categoryId)?.name ?? "Unknown category",
      }));
  },
});

export const getAdminEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;
    const category = await ctx.db.get(event.categoryId);
    return { ...event, categoryName: category?.name ?? "Unknown category" };
  },
});

export const createEvent = mutation({
  args: {
    name: v.string(),
    categoryId: v.id("categories"),
    description: v.optional(v.string()),
    venue: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const name = requireText(args.name, "Event name", 160);
    const category = await getCategoryOrThrow(ctx, args.categoryId);
    if (!category.isActive) {
      throw appError("VALIDATION_ERROR", "Choose an active category for this event.");
    }
    validateDateRange(args.startsAt, args.endsAt);
    const now = Date.now();
    const eventId = await ctx.db.insert("events", {
      name,
      categoryId: args.categoryId,
      description: optionalText(args.description),
      venue: optionalText(args.venue, 160),
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      status: "upcoming",
      publicationStatus: "draft",
      resultStatus: "not_ready",
      createdAt: now,
      updatedAt: now,
      createdBy: actorSubject,
      updatedBy: actorSubject,
    });
    await writeAudit(ctx, {
      entityType: "event",
      entityId: eventId,
      action: "create",
      actorSubject,
      detail: name,
      newStatus: "draft",
    });
    return eventId;
  },
});

export const updateEventDetails = mutation({
  args: {
    eventId: v.id("events"),
    name: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    description: v.optional(v.string()),
    venue: v.optional(v.string()),
    startsAt: v.optional(v.union(v.number(), v.null())),
    endsAt: v.optional(v.union(v.number(), v.null())),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const event = await getEventOrThrow(ctx, args.eventId);
    const patch: Partial<Doc<"events">> = { updatedAt: Date.now(), updatedBy: actorSubject };
    const nextStartsAt = args.startsAt === undefined ? event.startsAt : (args.startsAt ?? undefined);
    const nextEndsAt = args.endsAt === undefined ? event.endsAt : (args.endsAt ?? undefined);

    if (args.name !== undefined) patch.name = requireText(args.name, "Event name", 160);
    if (args.categoryId !== undefined) {
      const category = await getCategoryOrThrow(ctx, args.categoryId);
      if (!category.isActive) {
        throw appError("VALIDATION_ERROR", "Choose an active category for this event.");
      }
      patch.categoryId = args.categoryId;
    }
    if (args.description !== undefined) patch.description = optionalText(args.description);
    if (args.venue !== undefined) patch.venue = optionalText(args.venue, 160);
    if (args.startsAt !== undefined) patch.startsAt = nextStartsAt;
    if (args.endsAt !== undefined) patch.endsAt = nextEndsAt;

    validateDateRange(nextStartsAt, nextEndsAt);

    await ctx.db.patch(args.eventId, patch);
    await writeAudit(ctx, {
      entityType: "event",
      entityId: args.eventId,
      action: "update_details",
      actorSubject,
      reason: optionalText(args.reason, 500),
      detail: patch.name ?? event.name,
    });
  },
});

export const setEventStatus = mutation({
  args: {
    eventId: v.id("events"),
    status: eventStatusValidator,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const event = await getEventOrThrow(ctx, args.eventId);
    if (event.status === args.status) return;

    if (event.status === "completed" && args.status !== "live") {
      throw appError(
        "INVALID_STATE_TRANSITION",
        "A completed event can only be reopened to live.",
      );
    }
    if (!isAllowedEventTransition(event.status as EventStatus, args.status as EventStatus)) {
      throw appError(
        "INVALID_STATE_TRANSITION",
        `An event cannot move from ${event.status} to ${args.status}.`,
      );
    }

    let reason = optionalText(args.reason, 500);
    if (isRestrictedEventTransition(event.status as EventStatus, args.status as EventStatus)) {
      reason = requireReason(
        reason,
        "A reason is required to reopen a completed or cancelled event.",
      );
    }

    await ctx.db.patch(args.eventId, {
      status: args.status,
      updatedAt: Date.now(),
      updatedBy: actorSubject,
    });
    await writeAudit(ctx, {
      entityType: "event",
      entityId: args.eventId,
      action: "status_change",
      actorSubject,
      reason,
      oldStatus: event.status,
      newStatus: args.status,
      detail: event.name,
    });
  },
});

export const setEventPublication = mutation({
  args: {
    eventId: v.id("events"),
    publicationStatus: publicationStatusValidator,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const event = await getEventOrThrow(ctx, args.eventId);
    if (event.publicationStatus === args.publicationStatus) return;

    const allowed = PUBLICATION_TRANSITIONS[event.publicationStatus] ?? [];
    if (!allowed.includes(args.publicationStatus)) {
      throw appError(
        "INVALID_STATE_TRANSITION",
        `An event cannot move from ${event.publicationStatus} to ${args.publicationStatus}.`,
      );
    }

    let reason = optionalText(args.reason, 500);
    if (event.publicationStatus === "published") {
      reason = requireReason(reason, "A reason is required to unpublish or archive a public event.");
    }

    if (args.publicationStatus === "published") {
      await getCategoryOrThrow(ctx, event.categoryId);
    }

    await ctx.db.patch(args.eventId, {
      publicationStatus: args.publicationStatus,
      updatedAt: Date.now(),
      updatedBy: actorSubject,
    });
    await writeAudit(ctx, {
      entityType: "event",
      entityId: args.eventId,
      action: "publication_change",
      actorSubject,
      reason,
      oldStatus: event.publicationStatus,
      newStatus: args.publicationStatus,
      detail: event.name,
    });
  },
});

export const setResultStatus = mutation({
  args: {
    eventId: v.id("events"),
    resultStatus: resultStatusValidator,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const event = await getEventOrThrow(ctx, args.eventId);
    if (event.resultStatus === args.resultStatus) return;

    if (event.publicationStatus !== "published") {
      throw appError(
        "INVALID_STATE_TRANSITION",
        "Publish the event before publishing or finalizing results.",
      );
    }
    if (!isAllowedResultTransition(event.resultStatus as ResultStatus, args.resultStatus as ResultStatus)) {
      throw appError(
        "INVALID_STATE_TRANSITION",
        `Results cannot move from ${event.resultStatus} to ${args.resultStatus}.`,
      );
    }

    const publishedScores = await ctx.db
      .query("scores")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    const hasPublished = publishedScores.some((score) => score.status === "published");
    if (!hasPublished) {
      throw appError(
        "INVALID_STATE_TRANSITION",
        "Add at least one published score before publishing results.",
      );
    }

    let reason = optionalText(args.reason, 500);
    if (
      resultTransitionNeedsReason(
        event.resultStatus as ResultStatus,
        args.resultStatus as ResultStatus,
      )
    ) {
      reason = requireReason(reason, "A reason is required to reopen or hide results.");
    }

    const now = Date.now();
    await ctx.db.patch(args.eventId, {
      resultStatus: args.resultStatus,
      resultsPublishedAt: event.resultsPublishedAt ?? now,
      resultsFinalizedAt: args.resultStatus === "final" ? now : undefined,
      updatedAt: now,
      updatedBy: actorSubject,
    });
    await writeAudit(ctx, {
      entityType: "event",
      entityId: args.eventId,
      action: "result_status_change",
      actorSubject,
      reason,
      oldStatus: event.resultStatus,
      newStatus: args.resultStatus,
      detail: event.name,
    });
  },
});

export const listScoresForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const event = await getEventOrThrow(ctx, args.eventId);
    const [category, schools, scores, settings] = await Promise.all([
      ctx.db.get(event.categoryId),
      ctx.db.query("schools").collect(),
      ctx.db.query("scores").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).collect(),
      getAppSettings(ctx),
    ]);
    const scoreMap = new Map(scores.map((score) => [score.schoolId, score]));
    return {
      event,
      category: category ?? null,
      settings: {
        minimumPoints: settings.minimumPoints,
        maximumPoints: settings.maximumPoints,
        allowDecimalPoints: settings.allowDecimalPoints,
        eventTimezone: settings.eventTimezone,
      },
      schools: schools
        .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, "en"))
        .map((school) => ({
          _id: school._id,
          name: school.name,
          isActive: school.isActive,
          score: scoreMap.get(school._id) ?? null,
        })),
    };
  },
});

export const setScore = mutation({
  args: {
    eventId: v.id("events"),
    schoolId: v.id("schools"),
    points: v.number(),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    note: v.optional(v.string()),
    reason: v.optional(v.string()),
    expectedRevision: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const [event, school, settings] = await Promise.all([
      getEventOrThrow(ctx, args.eventId),
      ctx.db.get(args.schoolId),
      getAppSettings(ctx),
    ]);
    if (!school) throw appError("NOT_FOUND", "That school could not be found.");
    if (event.status === "cancelled") {
      throw appError("INVALID_STATE_TRANSITION", "Scores cannot be added to a cancelled event.");
    }
    if (event.resultStatus === "final") {
      throw appError(
        "INVALID_STATE_TRANSITION",
        "Results are final. Reopen results before editing scores.",
      );
    }

    const validated = validatePoints(args.points, settings.pointPolicy);
    if (!validated.ok) throw appError("VALIDATION_ERROR", validated.message);

    const status = args.status ?? "published";
    const note = optionalText(args.note, 500);
    const existing = await ctx.db
      .query("scores")
      .withIndex("by_event_school", (q) =>
        q.eq("eventId", args.eventId).eq("schoolId", args.schoolId),
      )
      .first();
    const now = Date.now();

    if (!existing) {
      const scoreId = await ctx.db.insert("scores", {
        eventId: args.eventId,
        schoolId: args.schoolId,
        points: validated.value,
        status,
        note,
        revision: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: actorSubject,
        updatedBy: actorSubject,
      });
      await writeAudit(ctx, {
        entityType: "score",
        entityId: scoreId,
        action: "create",
        actorSubject,
        newPoints: validated.value,
        newStatus: status,
        detail: `${event.name} — ${school.name}`,
      });
      return { scoreId, revision: 1, changed: true };
    }

    if (
      args.expectedRevision !== undefined &&
      args.expectedRevision !== existing.revision
    ) {
      throw appError(
        "STALE_UPDATE",
        "Another admin changed this score. Refresh the page and try again.",
      );
    }

    if (
      existing.points === validated.value &&
      existing.status === status &&
      existing.note === note
    ) {
      return { scoreId: existing._id, revision: existing.revision, changed: false };
    }

    if (existing.status === "published" && status === "draft") {
      const reason = requireReason(
        optionalText(args.reason, 500),
        "A reason is required to move a published score back to draft.",
      );
      await ctx.db.patch(existing._id, {
        points: validated.value,
        status,
        note,
        revision: existing.revision + 1,
        updatedAt: now,
        updatedBy: actorSubject,
      });
      await writeAudit(ctx, {
        entityType: "score",
        entityId: existing._id,
        action: "update",
        actorSubject,
        reason,
        oldPoints: existing.points,
        newPoints: validated.value,
        oldStatus: existing.status,
        newStatus: status,
        detail: `${event.name} — ${school.name}`,
      });
      return { scoreId: existing._id, revision: existing.revision + 1, changed: true };
    }

    await ctx.db.patch(existing._id, {
      points: validated.value,
      status,
      note,
      revision: existing.revision + 1,
      updatedAt: now,
      updatedBy: actorSubject,
    });
    await writeAudit(ctx, {
      entityType: "score",
      entityId: existing._id,
      action: "update",
      actorSubject,
      oldPoints: existing.points,
      newPoints: validated.value,
      oldStatus: existing.status,
      newStatus: status,
      detail: `${event.name} — ${school.name}`,
    });
    return { scoreId: existing._id, revision: existing.revision + 1, changed: true };
  },
});

export const voidScore = mutation({
  args: {
    scoreId: v.id("scores"),
    reason: v.string(),
    expectedRevision: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const score = await ctx.db.get(args.scoreId);
    if (!score) throw appError("NOT_FOUND", "That score could not be found.");
    if (score.status === "voided") return;
    if (args.expectedRevision !== undefined && args.expectedRevision !== score.revision) {
      throw appError(
        "STALE_UPDATE",
        "Another admin changed this score. Refresh the page and try again.",
      );
    }
    const event = await getEventOrThrow(ctx, score.eventId);
    if (event.resultStatus === "final") {
      throw appError(
        "INVALID_STATE_TRANSITION",
        "Results are final. Reopen results before voiding a score.",
      );
    }
    const reason = requireReason(args.reason, "A reason is required to void a score.");
    await ctx.db.patch(args.scoreId, {
      status: "voided",
      revision: score.revision + 1,
      updatedAt: Date.now(),
      updatedBy: actorSubject,
    });
    await writeAudit(ctx, {
      entityType: "score",
      entityId: args.scoreId,
      action: "void",
      actorSubject,
      reason,
      oldPoints: score.points,
      oldStatus: score.status,
      newStatus: "voided",
      detail: event.name,
    });
  },
});

export const listGallery = query({
  args: {
    status: v.optional(galleryStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(Math.max(args.limit ?? 60, 1), 200);
    const items = args.status
      ? await ctx.db
          .query("galleryItems")
          .withIndex("by_status_updated_at", (q) => q.eq("status", args.status!))
          .order("desc")
          .take(limit)
      : (await ctx.db.query("galleryItems").collect())
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, limit);

    const [events, categories] = await Promise.all([
      ctx.db.query("events").collect(),
      ctx.db.query("categories").collect(),
    ]);
    const eventMap = new Map(events.map((event) => [event._id, event]));
    const categoryMap = new Map(categories.map((category) => [category._id, category]));

    return Promise.all(
      items.map(async (item) => ({
        ...item,
        url: item.storageId ? await ctx.storage.getUrl(item.storageId) : null,
        eventName: item.eventId ? eventMap.get(item.eventId)?.name ?? null : null,
        categoryName: item.categoryId ? categoryMap.get(item.categoryId)?.name ?? null : null,
      })),
    );
  },
});

export const updateGalleryItem = mutation({
  args: {
    galleryItemId: v.id("galleryItems"),
    caption: v.optional(v.string()),
    altText: v.optional(v.string()),
    eventId: v.optional(v.id("events")),
    categoryId: v.optional(v.id("categories")),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const item = await ctx.db.get(args.galleryItemId);
    if (!item) throw appError("NOT_FOUND", "That gallery item could not be found.");

    const patch: Partial<Doc<"galleryItems">> = {
      updatedAt: Date.now(),
    };
    if (args.caption !== undefined) patch.caption = optionalText(args.caption, 300);
    if (args.altText !== undefined) patch.altText = optionalText(args.altText, 300);
    if (args.displayOrder !== undefined) patch.displayOrder = args.displayOrder;
    if (args.eventId !== undefined) {
      const event = await getEventOrThrow(ctx, args.eventId);
      patch.eventId = event._id;
      patch.categoryId = event.categoryId;
    }
    if (args.categoryId !== undefined) {
      await getCategoryOrThrow(ctx, args.categoryId);
      patch.categoryId = args.categoryId;
    }

    await ctx.db.patch(args.galleryItemId, patch);
    await writeAudit(ctx, {
      entityType: "galleryItem",
      entityId: args.galleryItemId,
      action: "update",
      actorSubject,
      detail: item.driveName,
    });
  },
});

export const setGalleryItemStatus = mutation({
  args: {
    galleryItemId: v.id("galleryItems"),
    status: v.union(
      v.literal("pending_review"),
      v.literal("published"),
      v.literal("hidden"),
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const item = await ctx.db.get(args.galleryItemId);
    if (!item) throw appError("NOT_FOUND", "That gallery item could not be found.");
    if (item.status === args.status) return;
    if (args.status === "published" && !item.storageId) {
      throw appError(
        "INVALID_STATE_TRANSITION",
        "This item has no stored image yet. Run the Drive sync before publishing it.",
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.galleryItemId, {
      status: args.status,
      publishedAt: args.status === "published" ? item.publishedAt ?? now : item.publishedAt,
      reviewedBy: actorSubject,
      updatedAt: now,
    });
    await writeAudit(ctx, {
      entityType: "galleryItem",
      entityId: args.galleryItemId,
      action: "status_change",
      actorSubject,
      reason: optionalText(args.reason, 500),
      oldStatus: item.status,
      newStatus: args.status,
      detail: item.driveName,
    });
  },
});

export const listAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
    entityType: v.optional(
      v.union(
        v.literal("school"),
        v.literal("category"),
        v.literal("event"),
        v.literal("score"),
        v.literal("galleryItem"),
        v.literal("admin"),
        v.literal("settings"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const logs = args.entityType
      ? await ctx.db
          .query("auditLogs")
          .withIndex("by_entity_time", (q) => q.eq("entityType", args.entityType!))
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("auditLogs")
          .withIndex("by_created_at")
          .order("desc")
          .take(limit);

    const admins = await ctx.db.query("admins").collect();
    const adminMap = new Map(admins.map((admin) => [admin.authSubject, admin]));
    return logs.map((log) => ({
      ...log,
      actorName:
        adminMap.get(log.actorSubject)?.displayName ??
        adminMap.get(log.actorSubject)?.email ??
        log.actorSubject,
    }));
  },
});

export const listAdmins = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const admins = await ctx.db.query("admins").collect();
    return admins
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((admin) => ({
        _id: admin._id,
        displayName: admin.displayName ?? null,
        email: admin.email ?? null,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
      }));
  },
});

export const getAdminSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const settings = await getAppSettings(ctx);
    return {
      updatedAt: settings.updatedAt,
      eventTimezone: settings.eventTimezone,
      minimumPoints: settings.minimumPoints,
      maximumPoints: settings.maximumPoints,
      allowDecimalPoints: settings.allowDecimalPoints,
      showZeroScoreSchools: settings.showZeroScoreSchools,
      provisionalResultsPublic: settings.provisionalResultsPublic,
      galleryRequiresReview: settings.galleryRequiresReview,
      maxGalleryFileBytes: settings.maxGalleryFileBytes,
      driveFolderId: settings.driveFolderId ?? "",
    };
  },
});

export const updateSettings = mutation({
  args: {
    eventTimezone: v.optional(v.string()),
    minimumPoints: v.optional(v.number()),
    maximumPoints: v.optional(v.number()),
    allowDecimalPoints: v.optional(v.boolean()),
    showZeroScoreSchools: v.optional(v.boolean()),
    provisionalResultsPublic: v.optional(v.boolean()),
    galleryRequiresReview: v.optional(v.boolean()),
    maxGalleryFileBytes: v.optional(v.number()),
    driveFolderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { actorSubject } = await requireAdmin(ctx);
    const existing = await getSettingsRow(ctx);
    const resolved = await getAppSettings(ctx);

    const minimumPoints = args.minimumPoints ?? resolved.minimumPoints;
    const maximumPoints = args.maximumPoints ?? resolved.maximumPoints;
    if (!Number.isFinite(minimumPoints) || !Number.isFinite(maximumPoints)) {
      throw appError("VALIDATION_ERROR", "Point limits must be numbers.");
    }
    if (minimumPoints > maximumPoints) {
      throw appError("VALIDATION_ERROR", "Minimum points cannot be greater than maximum points.");
    }

    if (args.eventTimezone !== undefined) {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: args.eventTimezone });
      } catch {
        throw appError("VALIDATION_ERROR", "That timezone is not recognized.");
      }
    }

    if (args.maxGalleryFileBytes !== undefined) {
      if (
        !Number.isFinite(args.maxGalleryFileBytes) ||
        args.maxGalleryFileBytes < 1024 * 1024 ||
        args.maxGalleryFileBytes > 100 * 1024 * 1024
      ) {
        throw appError("VALIDATION_ERROR", "Gallery file limit must be between 1 MB and 100 MB.");
      }
    }

    const patch = {
      eventTimezone: args.eventTimezone ?? resolved.eventTimezone,
      minimumPoints,
      maximumPoints,
      allowDecimalPoints: args.allowDecimalPoints ?? resolved.allowDecimalPoints,
      showZeroScoreSchools: args.showZeroScoreSchools ?? resolved.showZeroScoreSchools,
      provisionalResultsPublic:
        args.provisionalResultsPublic ?? resolved.provisionalResultsPublic,
      galleryRequiresReview: args.galleryRequiresReview ?? resolved.galleryRequiresReview,
      maxGalleryFileBytes: args.maxGalleryFileBytes ?? resolved.maxGalleryFileBytes,
      driveFolderId:
        args.driveFolderId !== undefined
          ? optionalText(args.driveFolderId, 200)
          : resolved.driveFolderId,
      updatedAt: Date.now(),
      updatedBy: actorSubject,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("appSettings", { key: SETTINGS_KEY, ...patch });
    }
    await writeAudit(ctx, {
      entityType: "settings",
      entityId: SETTINGS_KEY,
      action: "update",
      actorSubject,
    });
  },
});

export const driveStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const settings = await getAppSettings(ctx);
    const folderId = settings.driveFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
    const envStatus = getDriveConfigStatus({
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
      GOOGLE_DRIVE_FOLDER_ID: folderId,
    });
    return {
      ...envStatus,
      folderConfigured: Boolean(folderId),
      settingsFolderId: settings.driveFolderId ?? null,
      lastSync: await ctx.db
        .query("driveSyncRuns")
        .withIndex("by_started_at")
        .order("desc")
        .first(),
    };
  },
});
