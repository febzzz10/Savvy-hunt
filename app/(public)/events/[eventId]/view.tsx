"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/empty-state";
import { StandingsTable } from "@/components/standings-table";
import { StatusPill } from "@/components/status-pill";
import { formatDateTime, formatTime } from "@/lib/format";

export function EventView({ eventId }: { eventId: string }) {
  const data = useQuery(api.public.getEvent, { eventId: eventId as Id<"events"> });

  if (data === undefined) {
    return (
      <div className="shell animate-pulse pb-20 pt-16">
        <div className="h-3 w-48 bg-paper-deep" />
        <div className="mt-5 h-16 w-3/4 bg-paper-deep" />
        <div className="mt-8 h-4 w-96 max-w-full bg-paper-deep" />
        <div className="mt-12 h-64 border border-line bg-white/40" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="shell pb-20 pt-16">
        <EmptyState
          title="This event is not public."
          copy="It may be a draft, archived, or no longer on the schedule."
          action={
            <Link href="/schedule" className="btn btn-primary">
              Back to schedule
            </Link>
          }
        />
      </div>
    );
  }

  const { event, category, results, visibility } = data;

  return (
    <div className="shell pb-20 pt-12 md:pt-16">
      <nav className="mb-8 text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/schedule" className="hover:text-ink">
          Schedule
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/scoreboard/categories/${category.slug}`} className="hover:text-ink">
          {category.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{event.name}</span>
      </nav>

      <header className="border-b border-line pb-10">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={event.status} />
          {visibility !== "none" ? (
            <StatusPill status={event.resultStatus} />
          ) : (
            <StatusPill status="not_ready" />
          )}
          <Link
            href={`/scoreboard/categories/${category.slug}`}
            className="ml-2 text-xs font-bold uppercase tracking-[0.13em] text-teal hover:underline"
          >
            {category.name}
          </Link>
        </div>
        <h1 className="display mt-6 max-w-5xl text-[clamp(2.8rem,7vw,6rem)]">{event.name}</h1>
        {event.description ? (
          <p className="mt-5 max-w-2xl text-sm leading-8 text-ink-soft md:text-base">
            {event.description}
          </p>
        ) : null}
      </header>

      <div className="grid gap-10 py-10 lg:grid-cols-[0.45fr_0.55fr]">
        <dl className="space-y-5 text-sm">
          <div>
            <dt className="eyebrow text-muted">When</dt>
            <dd className="mt-1.5 leading-7">
              {event.startsAt
                ? formatDateTime(event.startsAt, data.eventTimezone)
                : "Time to be announced"}
              {event.endsAt ? (
                <span className="block text-xs text-muted">
                  Ends {formatTime(event.endsAt, data.eventTimezone)}
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-muted">Where</dt>
            <dd className="mt-1.5 leading-7">{event.venue ?? "Venue to be announced"}</dd>
          </div>
          <div>
            <dt className="eyebrow text-muted">Category</dt>
            <dd className="mt-1.5">
              <Link
                href={`/scoreboard/categories/${category.slug}`}
                className="text-teal underline-offset-4 hover:underline"
              >
                {category.name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-muted">Timezone</dt>
            <dd className="mt-1.5 text-muted">{data.eventTimezone}</dd>
          </div>
        </dl>

        <div>
          <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
            <h2 className="display text-3xl">Event result</h2>
            <span className="text-xs text-muted">
              {visibility === "none" ? "Not public" : visibility === "final" ? "Final" : "Provisional"}
            </span>
          </div>

          {visibility === "none" ? (
            <div className="mt-5 border border-dashed border-line px-5 py-10">
              <p className="text-sm font-semibold">Results are not public yet.</p>
              <p className="mt-2 text-sm leading-7 text-muted">
                {event.status === "upcoming"
                  ? "This event has not started. Results will appear after scoring and publication."
                  : event.resultStatus === "not_ready"
                    ? "Scoring has not been published for this event."
                    : "Organizers have temporarily hidden these results."}
              </p>
            </div>
          ) : (
            <div className="mt-5">
              {visibility === "provisional" ? (
                <p className="mb-4 border-l-2 border-gold bg-gold/[0.08] px-3 py-2 text-xs text-ink-soft">
                  Provisional — these points may change before finalization.
                </p>
              ) : null}
              <StandingsTable rows={results} compact />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-line pt-6">
        <Link
          href="/scoreboard"
          className="text-xs font-bold uppercase tracking-[0.13em] text-teal hover:underline"
        >
          ← Back to the overall board
        </Link>
      </div>
    </div>
  );
}
