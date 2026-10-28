import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { appError } from "./lib/auth";
import { slugify } from "./lib/scoring";

const ACTOR = "system:seed";

export const seedDemoData = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.ALLOW_DEMO_SEED !== "true") {
      throw appError("FORBIDDEN", "Demo seeding is disabled. Set ALLOW_DEMO_SEED=true.");
    }
    const existingEvents = await ctx.db.query("events").take(1);
    if (existingEvents.length > 0) {
      throw appError(
        "ALREADY_EXISTS",
        "Events already exist. Demo seeding only runs on an empty event table.",
      );
    }

    const now = Date.now();
    const day = 86_400_000;

    const categorySeed = [
      { name: "Dance", description: "Solo, duet, and group movement." },
      { name: "Music", description: "Bands, ensembles, and solo performance." },
      { name: "Quiz", description: "Team knowledge and rapid recall." },
      { name: "Theatre", description: "Stagecraft, script, and performance." },
      { name: "Art", description: "Canvas, illustration, and design." },
    ];
    const schoolSeed = [
      "Greenwood High",
      "St. Xavier's",
      "Riverdale School",
      "Oakridge Academy",
      "Bluebell Public",
      "Meridian International",
    ];

    const categoryIds = new Map<string, Id<"categories">>();
    for (let index = 0; index < categorySeed.length; index += 1) {
      const category = categorySeed[index];
      const slug = slugify(category.name);
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      const categoryId =
        existing?._id ??
        (await ctx.db.insert("categories", {
          name: category.name,
          slug,
          description: category.description,
          displayOrder: index,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          createdBy: ACTOR,
          updatedBy: ACTOR,
        }));
      categoryIds.set(category.name, categoryId);
    }

    const schoolIds = new Map<string, Id<"schools">>();
    for (let index = 0; index < schoolSeed.length; index += 1) {
      const name = schoolSeed[index];
      const slug = slugify(name);
      const existing = await ctx.db
        .query("schools")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      const schoolId =
        existing?._id ??
        (await ctx.db.insert("schools", {
          name,
          slug,
          isActive: true,
          displayOrder: index,
          createdAt: now,
          updatedAt: now,
          createdBy: ACTOR,
          updatedBy: ACTOR,
        }));
      schoolIds.set(name, schoolId);
    }

    const eventSeed = [
      {
        name: "Solo Dance Showcase",
        category: "Dance",
        status: "live" as const,
        publicationStatus: "published" as const,
        resultStatus: "not_ready" as const,
        startsAt: now - 30 * 60 * 1000,
        endsAt: now + 60 * 60 * 1000,
        venue: "Main Auditorium",
        description: "A live showcase of solo performances across all six schools.",
      },
      {
        name: "Battle of the Bands",
        category: "Music",
        status: "completed" as const,
        publicationStatus: "published" as const,
        resultStatus: "final" as const,
        startsAt: now - 3 * day,
        endsAt: now - 3 * day + 2 * 60 * 60 * 1000,
        venue: "Open Air Stage",
        description: "Six bands, three judges, one trophy.",
      },
      {
        name: "Quiz Championship",
        category: "Quiz",
        status: "completed" as const,
        publicationStatus: "published" as const,
        resultStatus: "provisional" as const,
        startsAt: now - 2 * day,
        endsAt: now - 2 * day + 90 * 60 * 1000,
        venue: "Library Hall",
        description: "Provisional scores are visible while the quizmaster verifies one round.",
      },
      {
        name: "One-Act Play",
        category: "Theatre",
        status: "upcoming" as const,
        publicationStatus: "published" as const,
        resultStatus: "not_ready" as const,
        startsAt: now + 2 * day,
        endsAt: now + 2 * day + 2 * 60 * 60 * 1000,
        venue: "Black Box Theatre",
        description: "Each school stages an original fifteen-minute play.",
      },
      {
        name: "Canvas & Colour",
        category: "Art",
        status: "completed" as const,
        publicationStatus: "published" as const,
        resultStatus: "final" as const,
        startsAt: now - 4 * day,
        endsAt: now - 4 * day + 3 * 60 * 60 * 1000,
        venue: "Art Studio",
        description: "A timed open-theme painting competition.",
      },
      {
        name: "Street Theatre",
        category: "Theatre",
        status: "upcoming" as const,
        publicationStatus: "draft" as const,
        resultStatus: "not_ready" as const,
        startsAt: now + 5 * day,
        endsAt: now + 5 * day + 2 * 60 * 60 * 1000,
        venue: "School Courtyard",
        description: "A draft event, invisible to the public until published.",
      },
    ];

    const createdEventIds: Array<{ id: Id<"events">; name: string }> = [];
    for (const event of eventSeed) {
      const categoryId = categoryIds.get(event.category);
      if (!categoryId) continue;
      const eventId = await ctx.db.insert("events", {
        name: event.name,
        categoryId,
        description: event.description,
        venue: event.venue,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        status: event.status,
        publicationStatus: event.publicationStatus,
        resultStatus: event.resultStatus,
        resultsPublishedAt:
          event.resultStatus === "not_ready" ? undefined : now - day,
        resultsFinalizedAt: event.resultStatus === "final" ? now - day : undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: ACTOR,
        updatedBy: ACTOR,
      });
      createdEventIds.push({ id: eventId, name: event.name });
    }

    const scorePlan: Record<string, Array<[string, number]>> = {
      "Battle of the Bands": [
        ["Greenwood High", 94],
        ["St. Xavier's", 91],
        ["Riverdale School", 87],
        ["Oakridge Academy", 82],
        ["Bluebell Public", 78],
      ],
      "Quiz Championship": [
        ["Oakridge Academy", 88],
        ["Greenwood High", 88],
        ["Meridian International", 81],
        ["St. Xavier's", 75],
      ],
      "Canvas & Colour": [
        ["Meridian International", 96],
        ["Bluebell Public", 90],
        ["Riverdale School", 85],
        ["Greenwood High", 79],
      ],
    };

    let scoreCount = 0;
    for (const event of createdEventIds) {
      const plan = scorePlan[event.name];
      if (!plan) continue;
      for (const [schoolName, points] of plan) {
        const schoolId = schoolIds.get(schoolName);
        if (!schoolId) continue;
        const existing = await ctx.db
          .query("scores")
          .withIndex("by_event_school", (q) =>
            q.eq("eventId", event.id).eq("schoolId", schoolId),
          )
          .first();
        if (existing) continue;
        await ctx.db.insert("scores", {
          eventId: event.id,
          schoolId,
          points,
          status: "published",
          revision: 1,
          createdAt: now,
          updatedAt: now,
          createdBy: ACTOR,
          updatedBy: ACTOR,
        });
        scoreCount += 1;
      }
    }

    await ctx.db.insert("auditLogs", {
      entityType: "settings",
      entityId: "demo-seed",
      action: "seed_demo_data",
      actorSubject: ACTOR,
      detail: `${categorySeed.length} categories, ${schoolSeed.length} schools, ${createdEventIds.length} events, ${scoreCount} scores`,
      createdAt: now,
    });

    return {
      categories: categorySeed.length,
      schools: schoolSeed.length,
      events: createdEventIds.length,
      scores: scoreCount,
    };
  },
});
