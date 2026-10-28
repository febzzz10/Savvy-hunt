export type PointPolicy = {
  minimumPoints: number;
  maximumPoints: number;
  allowDecimalPoints: boolean;
};

export const DEFAULT_POINT_POLICY: PointPolicy = {
  minimumPoints: 0,
  maximumPoints: 1000,
  allowDecimalPoints: true,
};

export type PointValidation =
  | { ok: true; value: number }
  | { ok: false; message: string };

export function validatePoints(input: unknown, policy: PointPolicy): PointValidation {
  if (typeof input !== "number") {
    return { ok: false, message: "Points must be a number." };
  }
  if (!Number.isFinite(input)) {
    return { ok: false, message: "Points must be a finite number." };
  }
  if (Object.is(input, -0)) {
    return { ok: true, value: 0 };
  }
  if (!policy.allowDecimalPoints && !Number.isInteger(input)) {
    return { ok: false, message: "This competition accepts whole-number points only." };
  }
  if (input < policy.minimumPoints || input > policy.maximumPoints) {
    return {
      ok: false,
      message: `Points must be between ${policy.minimumPoints} and ${policy.maximumPoints}.`,
    };
  }
  return { ok: true, value: input };
}

export type EventStatus =
  | "upcoming"
  | "live"
  | "paused"
  | "postponed"
  | "completed"
  | "cancelled";

export type ResultStatus = "not_ready" | "provisional" | "final";
export type PublicationStatus = "draft" | "published" | "archived";

const EVENT_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  upcoming: ["live", "postponed", "cancelled"],
  live: ["paused", "postponed", "completed", "cancelled"],
  paused: ["live", "postponed", "completed", "cancelled"],
  postponed: ["upcoming", "live", "cancelled"],
  completed: ["live"],
  cancelled: ["upcoming"],
};

const RESTRICTED_EVENT_TRANSITIONS = new Set(["completed:live", "cancelled:upcoming"]);

export function isAllowedEventTransition(from: EventStatus, to: EventStatus): boolean {
  if (from === to) return false;
  return EVENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isRestrictedEventTransition(from: EventStatus, to: EventStatus): boolean {
  return RESTRICTED_EVENT_TRANSITIONS.has(`${from}:${to}`);
}

const RESULT_TRANSITIONS: Record<ResultStatus, ResultStatus[]> = {
  not_ready: ["provisional", "final"],
  provisional: ["final", "not_ready"],
  final: ["provisional", "not_ready"],
};

export function isAllowedResultTransition(from: ResultStatus, to: ResultStatus): boolean {
  if (from === to) return false;
  return RESULT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function resultTransitionNeedsReason(from: ResultStatus, to: ResultStatus): boolean {
  return from === "final" || to === "not_ready";
}

export type ResultVisibility = "none" | "provisional" | "final";

export function getResultVisibility(
  event: { publicationStatus: PublicationStatus; resultStatus: ResultStatus },
  provisionalResultsPublic: boolean,
): ResultVisibility {
  if (event.publicationStatus !== "published") return "none";
  if (event.resultStatus === "final") return "final";
  if (event.resultStatus === "provisional" && provisionalResultsPublic) return "provisional";
  return "none";
}

export function isEligibleScore(
  score: { status: string },
  event: { publicationStatus: PublicationStatus; resultStatus: ResultStatus },
  provisionalResultsPublic: boolean,
): boolean {
  if (score.status !== "published") return false;
  return getResultVisibility(event, provisionalResultsPublic) !== "none";
}

export type StandingsInput = {
  schoolId: string;
  schoolName: string;
  slug: string;
  points: number;
  provisional?: boolean;
};

export type RankedStanding = StandingsInput & { rank: number };

export function rankStandings(rows: StandingsInput[]): RankedStanding[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const byName = a.schoolName.localeCompare(b.schoolName, "en");
    if (byName !== 0) return byName;
    return a.schoolId.localeCompare(b.schoolId);
  });

  let previousPoints: number | null = null;
  let previousRank = 0;
  return sorted.map((row, index) => {
    const rank = previousPoints !== null && row.points === previousPoints ? previousRank : index + 1;
    previousPoints = row.points;
    previousRank = rank;
    return { ...row, rank };
  });
}

export function topSchools<T>(rows: T[], count = 3): T[] {
  return rows.slice(0, count);
}

export function eventBelongsToGroup(
  event: {
    status: EventStatus;
    resultStatus: ResultStatus;
    publicationStatus: PublicationStatus;
  },
  group: "upcoming" | "live" | "results",
  provisionalResultsPublic: boolean,
): boolean {
  if (event.publicationStatus !== "published") return false;
  if (group === "results") {
    return (
      getResultVisibility(event, provisionalResultsPublic) !== "none" ||
      event.status === "completed" ||
      event.status === "cancelled"
    );
  }
  if (group === "live") {
    return event.status === "live" || event.status === "paused";
  }
  return event.status === "upcoming" || event.status === "postponed";
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
