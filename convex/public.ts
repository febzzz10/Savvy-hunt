import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { appError } from "./lib/auth";
import { getAppSettings } from "./lib/settings";
import { computeEventResults, computeStandings } from "./lib/standings";
import { getResultVisibility } from "./lib/scoring";

function timeValue(value: number | undefined): number {
  return value ?? Number.MAX_SAFE_INTEGER;
}

function sortByStart(a: Doc<"events">, b: Doc<"events">): number {
  return timeValue(a.startsAt) - timeValue(b.startsAt);
}

function sortByRecentResult(a: Doc<"events">, b: Doc<"events">): number {
  return (b.resultsPublishedAt ?? b.updatedAt) - (a.resultsPublishedAt ?? a.updatedAt);
}

export const getAppConfig = query({
  args: {},
  handler: async (ctx) => {
    const settings = await getAppSettings(ctx);
    return {
      siteName: "Savvy Hunt",
      eventTimezone: settings.eventTimezone,
      provisionalResultsPublic: settings.provisionalResultsPublic,
      serverTime: Date.now(),
    };
  },
});

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_active_display_order", (q) => q.eq("isActive", true))
      .collect();
    return categories.map((category) => ({
      _id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? null,
    }));
  },
});

export const getScoreboard = query({
  args: { categoryId: v.optional(v.id("categories")) },
  handler: async (ctx, args) => {
    const settings = await getAppSettings(ctx);
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_active_display_order", (q) => q.eq("isActive", true))
      .collect();

    let category = null;
    if (args.categoryId) {
      const found = await ctx.db.get(args.categoryId);
      if (!found || !found.isActive) {
        throw appError("NOT_FOUND", "That category is no longer available.");
      }
      category = { _id: found._id, name: found.name, slug: found.slug };
    }

    const result = await computeStandings(ctx, {
      categoryId: args.categoryId,
      provisionalResultsPublic: settings.provisionalResultsPublic,
      showZeroScoreSchools: settings.showZeroScoreSchools,
    });

    return {
      category,
      categories: categories.map((item) => ({ _id: item._id, name: item.name, slug: item.slug })),
      standings: result.standings,
      provisional: result.provisional,
      contributingEvents: result.contributingEvents,
      updatedAt: result.updatedAt,
      eventTimezone: settings.eventTimezone,
      provisionalResultsPublic: settings.provisionalResultsPublic,
    };
  },
});

export const getCategoryResults = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const settings = await getAppSettings(ctx);
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!category || !category.isActive) return null;

    const events = await ctx.db
      .query("events")
      .withIndex("by_category", (q) => q.eq("categoryId", category._id))
      .collect();

    const published = events
      .filter((event) => event.publicationStatus === "published")
      .sort(sortByStart);

    const items = [];
    for (const event of published) {
      const visibility = getResultVisibility(event, settings.provisionalResultsPublic);
      const results = visibility === "none" ? [] : await computeEventResults(ctx, event._id);
      items.push({
        event: {
          _id: event._id,
          name: event.name,
          description: event.description ?? null,
          venue: event.venue ?? null,
          startsAt: event.startsAt ?? null,
          endsAt: event.endsAt ?? null,
          status: event.status,
          resultStatus: event.resultStatus,
        },
        visibility,
        results,
      });
    }

    return {
      category: { _id: category._id, name: category.name, slug: category.slug },
      events: items,
      eventTimezone: settings.eventTimezone,
      provisionalResultsPublic: settings.provisionalResultsPublic,
    };
  },
});

export const getSchedule = query({
  args: {},
  handler: async (ctx) => {
    const settings = await getAppSettings(ctx);
    const [events, categories] = await Promise.all([
      ctx.db
        .query("events")
        .withIndex("by_publication_start", (q) => q.eq("publicationStatus", "published"))
        .collect(),
      ctx.db.query("categories").collect(),
    ]);
    const categoryMap = new Map(categories.map((category) => [category._id, category]));

    return {
      serverTime: Date.now(),
      eventTimezone: settings.eventTimezone,
      events: events.sort(sortByStart).map((event) => ({
        _id: event._id,
        name: event.name,
        description: event.description ?? null,
        venue: event.venue ?? null,
        startsAt: event.startsAt ?? null,
        endsAt: event.endsAt ?? null,
        status: event.status,
        resultStatus: event.resultStatus,
        resultVisibility: getResultVisibility(event, settings.provisionalResultsPublic),
        categoryName: categoryMap.get(event.categoryId)?.name ?? null,
        categorySlug: categoryMap.get(event.categoryId)?.slug ?? null,
      })),
    };
  },
});

export const getEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const settings = await getAppSettings(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event || event.publicationStatus !== "published") return null;
    const category = await ctx.db.get(event.categoryId);
    if (!category) return null;
    const visibility = getResultVisibility(event, settings.provisionalResultsPublic);
    const results = visibility === "none" ? [] : await computeEventResults(ctx, event._id);
    return {
      event: {
        _id: event._id,
        name: event.name,
        description: event.description ?? null,
        venue: event.venue ?? null,
        startsAt: event.startsAt ?? null,
        endsAt: event.endsAt ?? null,
        status: event.status,
        resultStatus: event.resultStatus,
      },
      category: { _id: category._id, name: category.name, slug: category.slug },
      visibility,
      results,
      eventTimezone: settings.eventTimezone,
      provisionalResultsPublic: settings.provisionalResultsPublic,
    };
  },
});

export const getGalleryPage = query({
  args: {
    paginationOpts: paginationOptsValidator,
    categoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    const settings = await getAppSettings(ctx);
    const categories = await ctx.db.query("categories").collect();
    const categoryMap = new Map(categories.map((category) => [category._id, category]));

    const result = args.categoryId
      ? await ctx.db
          .query("galleryItems")
          .withIndex("by_status_category_published_at", (q) =>
            q.eq("status", "published").eq("categoryId", args.categoryId),
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("galleryItems")
          .withIndex("by_status_published_at", (q) => q.eq("status", "published"))
          .order("desc")
          .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (item) => ({
        _id: item._id,
        url: item.storageId ? await ctx.storage.getUrl(item.storageId) : null,
        caption: item.caption ?? null,
        altText: item.altText ?? item.caption ?? "Savvy Hunt event photo",
        categoryName: item.categoryId ? categoryMap.get(item.categoryId)?.name ?? null : null,
        eventId: item.eventId ?? null,
        publishedAt: item.publishedAt ?? null,
      })),
    );

    return {
      ...result,
      page,
      eventTimezone: settings.eventTimezone,
    };
  },
});

export const getHome = query({
  args: {},
  handler: async (ctx) => {
    const settings = await getAppSettings(ctx);
    const [events, categories, schools, gallery] = await Promise.all([
      ctx.db
        .query("events")
        .withIndex("by_publication_start", (q) => q.eq("publicationStatus", "published"))
        .collect(),
      ctx.db.query("categories").collect(),
      ctx.db.query("schools").collect(),
      ctx.db
        .query("galleryItems")
        .withIndex("by_status_published_at", (q) => q.eq("status", "published"))
        .order("desc")
        .collect(),
    ]);

    const categoryMap = new Map(categories.map((category) => [category._id, category]));
    const publishedEvents = events.sort(sortByStart);

    const liveEvents = publishedEvents
      .filter((event) => event.status === "live" || event.status === "paused")
      .map((event) => ({
        _id: event._id,
        name: event.name,
        status: event.status,
        categoryName: categoryMap.get(event.categoryId)?.name ?? null,
      }));

    const upcomingEvents = publishedEvents
      .filter((event) => event.status === "upcoming" || event.status === "postponed")
      .filter((event) => (event.startsAt ?? 0) >= Date.now() - 86_400_000)
      .slice(0, 4)
      .map((event) => ({
        _id: event._id,
        name: event.name,
        startsAt: event.startsAt ?? null,
        venue: event.venue ?? null,
        status: event.status,
        categoryName: categoryMap.get(event.categoryId)?.name ?? null,
      }));

    const recentResults = publishedEvents
      .filter((event) => getResultVisibility(event, settings.provisionalResultsPublic) !== "none")
      .sort(sortByRecentResult)
      .slice(0, 5)
      .map((event) => ({
        _id: event._id,
        name: event.name,
        resultStatus: event.resultStatus,
        resultsPublishedAt: event.resultsPublishedAt ?? null,
        categoryName: categoryMap.get(event.categoryId)?.name ?? null,
        categorySlug: categoryMap.get(event.categoryId)?.slug ?? null,
      }));

    const standings = await computeStandings(ctx, {
      provisionalResultsPublic: settings.provisionalResultsPublic,
      showZeroScoreSchools: settings.showZeroScoreSchools,
    });

    const galleryPreview = await Promise.all(
      gallery.slice(0, 8).map(async (item) => ({
        _id: item._id,
        url: item.storageId ? await ctx.storage.getUrl(item.storageId) : null,
        altText: item.altText ?? item.caption ?? "Savvy Hunt event photo",
        caption: item.caption ?? null,
      })),
    );

    return {
      stats: {
        schools: schools.filter((school) => school.isActive).length,
        categories: categories.filter((category) => category.isActive).length,
        events: publishedEvents.length,
        photos: gallery.length,

      },
      standingsTop: standings.standings.slice(0, 3),
      provisional: standings.provisional,
      updatedAt: standings.updatedAt,
      liveEvents,
      upcomingEvents,
      recentResults,
      galleryPreview: galleryPreview.filter((item) => item.url !== null),
      eventTimezone: settings.eventTimezone,
      provisionalResultsPublic: settings.provisionalResultsPublic,
    };
  },
});
