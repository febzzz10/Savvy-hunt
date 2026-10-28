/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "./**/*.js", "!./**/*.test.ts"]);

const ADMIN_SUBJECT = "user_admin";

async function setup() {
  const t = convexTest(schema, modules as never);
  const now = Date.now();
  await t.run(async (ctx) => {
    await ctx.db.insert("admins", {
      authSubject: ADMIN_SUBJECT,
      email: "organizer@example.com",
      displayName: "Organizer",
      role: "admin",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  });
  return t.withIdentity({ subject: ADMIN_SUBJECT });
}

async function expectCode(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    throw new Error(`Expected rejection with ${code}`);
  } catch (error) {
    expect((error as { data?: { code?: string } }).data?.code).toBe(code);
  }
}

async function seedCompetition(admin: Awaited<ReturnType<typeof setup>>) {
  const categoryId = await admin.mutation(api.admin.createCategory, {
    name: "Science",
    displayOrder: 1,
  });
  const schoolA = await admin.mutation(api.admin.createSchool, { name: "Alpha School" });
  const schoolB = await admin.mutation(api.admin.createSchool, { name: "Beta School" });
  const schoolC = await admin.mutation(api.admin.createSchool, { name: "Gamma School" });
  const eventId = await admin.mutation(api.admin.createEvent, {
    name: "Quiz finals",
    categoryId,
    startsAt: Date.now() + 60_000,
  });
  return { categoryId, schoolA, schoolB, schoolC, eventId };
}

describe("admin lifecycle", () => {
  it("rejects unauthenticated and unknown admins", async () => {
    const t = convexTest(schema, modules as never);
    const outsider = t.withIdentity({ subject: "stranger" });
    await expectCode(t.mutation(api.admin.createSchool, { name: "Alpha" }), "UNAUTHENTICATED");
    await expectCode(outsider.mutation(api.admin.createSchool, { name: "Alpha" }), "FORBIDDEN");
  });

  it("publishes provisional standings, ranks ties, and locks final results", async () => {
    const admin = await setup();
    const { categoryId, schoolA, schoolB, schoolC, eventId } = await seedCompetition(admin);

    await admin.mutation(api.admin.setEventPublication, {
      eventId,
      publicationStatus: "published",
    });
    await admin.mutation(api.admin.setScore, {
      eventId,
      schoolId: schoolA,
      points: 10,
    });
    await admin.mutation(api.admin.setScore, {
      eventId,
      schoolId: schoolB,
      points: 10,
    });
    await admin.mutation(api.admin.setScore, {
      eventId,
      schoolId: schoolC,
      points: 5,
    });
    await admin.mutation(api.admin.setResultStatus, {
      eventId,
      resultStatus: "provisional",
    });

    const scoreboard = await admin.query(api.public.getScoreboard, { categoryId });
    expect(scoreboard.standings.map((row: { rank: number }) => row.rank)).toEqual([1, 1, 3]);
    expect(scoreboard.provisional).toBe(true);
    expect(scoreboard.contributingEvents).toBe(1);

    await admin.mutation(api.admin.setResultStatus, { eventId, resultStatus: "final" });
    const event = await admin.query(api.public.getEvent, { eventId });
    if (!event) throw new Error("Expected a published event");
    expect(event.visibility).toBe("final");
    expect(event.results).toHaveLength(3);

    await expectCode(
      admin.mutation(api.admin.setScore, {
        eventId,
        schoolId: schoolA,
        points: 99,
      }),
      "INVALID_STATE_TRANSITION",
    );
  });

  it("rejects stale score revisions and requires reasons to void", async () => {
    const admin = await setup();
    const { schoolA, eventId } = await seedCompetition(admin);

    const first = await admin.mutation(api.admin.setScore, {
      eventId,
      schoolId: schoolA,
      points: 8,
    });
    await expectCode(
      admin.mutation(api.admin.setScore, {
        eventId,
        schoolId: schoolA,
        points: 9,
        expectedRevision: first.revision + 5,
      }),
      "STALE_UPDATE",
    );

    const second = await admin.mutation(api.admin.setScore, {
      eventId,
      schoolId: schoolA,
      points: 9,
      expectedRevision: first.revision,
    });
    expect(second.changed).toBe(true);
    expect(second.revision).toBe(first.revision + 1);

    await expectCode(
      admin.mutation(api.admin.voidScore, {
        scoreId: first.scoreId,
        reason: "   ",
      }),
      "VALIDATION_ERROR",
    );

    const run = await admin.mutation(api.admin.voidScore, {
      scoreId: first.scoreId,
      reason: "Score entered for the wrong school",
    });
    expect(run).toBeNull();
  });

  it("hides unpublished events from public queries", async () => {
    const admin = await setup();
    const { eventId } = await seedCompetition(admin);
    await expect(admin.query(api.public.getEvent, { eventId })).resolves.toBeNull();
  });
});
