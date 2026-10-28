import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  getResultVisibility,
  rankStandings,
  type RankedStanding,
} from "./scoring";

export type StandingsResult = {
  standings: RankedStanding[];
  provisional: boolean;
  contributingEvents: number;
  updatedAt: number;
};

export async function computeStandings(
  ctx: QueryCtx,
  options: {
    categoryId?: Id<"categories">;
    provisionalResultsPublic: boolean;
    showZeroScoreSchools: boolean;
  },
): Promise<StandingsResult> {
  const allEvents = await ctx.db
    .query("events")
    .withIndex("by_publication_result", (q) => q.eq("publicationStatus", "published"))
    .collect();

  const eligibleEvents = new Map<
    string,
    {
      categoryId: Id<"categories">;
      provisional: boolean;
      updatedAt: number;
    }
  >();

  for (const event of allEvents) {
    if (event.publicationStatus !== "published") continue;
    if (options.categoryId && event.categoryId !== options.categoryId) continue;
    const visibility = getResultVisibility(event, options.provisionalResultsPublic);
    if (visibility === "none") continue;
    eligibleEvents.set(event._id, {
      categoryId: event.categoryId,
      provisional: visibility === "provisional",
      updatedAt: event.updatedAt,
    });
  }

  const totals = new Map<string, { points: number; provisional: boolean }>();
  let updatedAt = 0;
  let provisional = false;

  if (eligibleEvents.size > 0) {
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    for (const score of scores) {
      const event = eligibleEvents.get(score.eventId);
      if (!event) continue;
      const current = totals.get(score.schoolId) ?? { points: 0, provisional: false };
      current.points += score.points;
      current.provisional = current.provisional || event.provisional;
      totals.set(score.schoolId, current);
      updatedAt = Math.max(updatedAt, score.updatedAt, event.updatedAt);
      provisional = provisional || event.provisional;
    }
  }

  const schools = await ctx.db.query("schools").collect();
  const rows = [];
  for (const school of schools) {
    const total = totals.get(school._id);
    if (!total) {
      if (!options.showZeroScoreSchools || !school.isActive) continue;
      rows.push({
        schoolId: school._id,
        schoolName: school.name,
        slug: school.slug,
        points: 0,
        provisional: false,
      });
      continue;
    }
    rows.push({
      schoolId: school._id,
      schoolName: school.name,
      slug: school.slug,
      points: total.points,
      provisional: total.provisional,
    });
  }

  return {
    standings: rankStandings(rows),
    provisional,
    contributingEvents: eligibleEvents.size,
    updatedAt,
  };
}

export async function computeEventResults(
  ctx: QueryCtx,
  eventId: Id<"events">,
): Promise<RankedStanding[]> {
  const scores = await ctx.db
    .query("scores")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const schools = await ctx.db.query("schools").collect();
  const schoolMap = new Map(schools.map((school) => [school._id, school]));

  const rows = [];
  for (const score of scores) {
    if (score.status !== "published") continue;
    const school = schoolMap.get(score.schoolId);
    if (!school) continue;
    rows.push({
      schoolId: school._id,
      schoolName: school.name,
      slug: school.slug,
      points: score.points,
      provisional: false,
    });
  }

  return rankStandings(rows);
}
