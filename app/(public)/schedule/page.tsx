"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";
import { formatDayLabel, formatTime } from "@/lib/format";

type ScheduleEvent = {
  _id: string;
  name: string;
  description: string | null;
  venue: string | null;
  startsAt: number | null;
  endsAt: number | null;
  status: string;
  resultStatus: string;
  resultVisibility: string;
  categoryName: string | null;
  categorySlug: string | null;
};

const FILTERS = [
  { key: "all", label: "Everything" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "results", label: "Results" },
] as const;

function groupKey(event: ScheduleEvent, timezone: string): string {
  if (!event.startsAt) return "tba";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).format(new Date(event.startsAt));
}

export default function SchedulePage() {
  const data = useQuery(api.public.getSchedule);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  const visible = useMemo(() => {
    const events: ScheduleEvent[] = data?.events ?? [];
    if (filter === "all") return events;
    if (filter === "live") return events.filter((event) => event.status === "live" || event.status === "paused");
    if (filter === "upcoming") {
      return events.filter((event) => event.status === "upcoming" || event.status === "postponed");
    }
    return events.filter(
      (event) =>
        event.resultVisibility !== "none" ||
        event.status === "completed" ||
        event.status === "cancelled",
    );
  }, [data?.events, filter]);

  const groups = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { label: string; events: ScheduleEvent[] }>();
    for (const event of visible) {
      const key = groupKey(event, data.eventTimezone);
      const label = event.startsAt
        ? formatDayLabel(event.startsAt, data.eventTimezone)
        : "Date to be announced";
      const group = map.get(key) ?? { label, events: [] };
      group.events.push(event);
      map.set(key, group);
    }
    return Array.from(map.entries());
  }, [data, visible]);

  return (
    <div className="shell pb-20 pt-12 md:pt-16">
      <header className="grid gap-8 border-b border-line pb-10 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
        <div>
          <p className="eyebrow text-flame">The calendar</p>
          <h1 className="display mt-4 text-[clamp(3rem,7vw,5.6rem)]">
            What happens <span className="italic text-flame">when.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted md:text-base">
            The public schedule, grouped by day in the event timezone. Event status updates
            live as organizers move things along.
          </p>
        </div>
        {data ? (
          <p className="text-xs leading-6 text-muted">
            All times shown in {data.eventTimezone}. Postponed events keep their original slot
            until organizers publish a new time.
          </p>
        ) : null}
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            className={`border px-3.5 py-2 text-[0.68rem] font-bold uppercase tracking-[0.13em] transition-colors ${
              filter === option.key
                ? "border-ink bg-ink text-paper"
                : "border-line text-muted hover:border-ink hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted">
          {visible.length} {visible.length === 1 ? "event" : "events"}
        </span>
      </div>

      {data === undefined ? (
        <div className="mt-8 animate-pulse space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index}>
              <div className="h-4 w-44 bg-paper-deep" />
              <div className="mt-4 space-y-3">
                <div className="h-20 border border-line bg-white/40" />
                <div className="h-20 border border-line bg-white/40" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing in this view."
            copy="Try another filter, or check back when organizers publish the next event."
          />
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {groups.map(([key, group]) => (
            <section key={key}>
              <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-2">
                <h2 className="display text-2xl md:text-3xl">{group.label}</h2>
                <span className="text-xs text-muted">
                  {group.events.length} {group.events.length === 1 ? "event" : "events"}
                </span>
              </div>
              <ul>
                {group.events.map((event) => (
                  <li key={event._id} className="border-b border-line">
                    <Link
                      href={`/events/${event._id}`}
                      className="group grid gap-3 py-5 md:grid-cols-[7rem_1fr_auto] md:items-center md:gap-6"
                    >
                      <div>
                        <p className="display text-xl tabular-nums">
                          {event.startsAt ? formatTime(event.startsAt, data.eventTimezone) : "TBA"}
                        </p>
                        {event.endsAt ? (
                          <p className="text-[0.65rem] uppercase tracking-widest text-muted">
                            until {formatTime(event.endsAt, data.eventTimezone)}
                          </p>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-semibold group-hover:text-flame">{event.name}</p>
                        <p className="mt-1 text-xs text-muted">
                          {event.categoryName ?? "Uncategorized"}
                          {event.venue ? ` · ${event.venue}` : ""}
                        </p>
                        {event.description ? (
                          <p className="mt-1 line-clamp-1 text-xs text-muted">{event.description}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={event.status} />
                        {event.resultVisibility !== "none" ? (
                          <StatusPill status={event.resultStatus} />
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
