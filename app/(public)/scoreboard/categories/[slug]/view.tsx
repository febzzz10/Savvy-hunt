"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { EmptyState } from "@/components/empty-state";
import { StandingsTable } from "@/components/standings-table";
import { StatusPill } from "@/components/status-pill";
import { formatDateTime } from "@/lib/format";

export function CategoryResultsView({ slug }: { slug: string }) {
  const data = useQuery(api.public.getCategoryResults, { slug });

  if (data === undefined) {
    return (
      <div className="shell animate-pulse pb-20 pt-16">
        <div className="h-3 w-32 bg-paper-deep" />
        <div className="mt-5 h-14 w-2/3 bg-paper-deep" />
        <div className="mt-4 h-4 w-80 max-w-full bg-paper-deep" />
        <div className="mt-12 space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-44 border border-line bg-white/40" />
          ))}
        </div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="shell pb-20 pt-16">
        <EmptyState
          title="That category is not on the board."
          copy="The category may have been archived or renamed. Browse the full list to find the right one."
          action={
            <Link href="/scoreboard/categories" className="btn btn-primary">
              All categories
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="shell pb-20 pt-12 md:pt-16">
      <nav className="mb-8 text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/scoreboard" className="hover:text-ink">
          Scoreboard
        </Link>
        <span className="mx-2">/</span>
        <Link href="/scoreboard/categories" className="hover:text-ink">
          Categories
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{data.category.name}</span>
      </nav>

      <header className="grid gap-6 border-b border-line pb-10 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
        <div>
          <p className="eyebrow text-flame">Category results</p>
          <h1 className="display mt-4 text-[clamp(3rem,7vw,5.6rem)]">{data.category.name}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted">
            Every published event in this category, in schedule order. Results that are not
            ready stay private until organizers publish them.
          </p>
        </div>
        <p className="text-xs leading-6 text-muted">
          Times shown in {data.eventTimezone}. Provisional results are marked and may change
          before they are finalized.
        </p>
      </header>

      {data.events.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No public events in this category yet."
            copy="Once organizers publish an event here, it will show up with its results."
            action={
              <Link href="/schedule" className="btn btn-ghost">
                View schedule
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {data.events.map(
            (
              item: {
                event: {
                  _id: string;
                  name: string;
                  description: string | null;
                  venue: string | null;
                  startsAt: number | null;
                  endsAt: number | null;
                  status: string;
                  resultStatus: string;
                };
                visibility: string;
                results: Array<{
                  schoolId: string;
                  schoolName: string;
                  points: number;
                  rank: number;
                }>;
              },
              index: number,
            ) => (
              <section key={item.event._id} className="grid gap-6 lg:grid-cols-[0.34fr_0.66fr]">
                <div className="border-t border-ink pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="display text-3xl text-line">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <StatusPill status={item.event.status} />
                  </div>
                  <h2 className="display mt-3 text-3xl leading-[1.02]">
                    <Link href={`/events/${item.event._id}`} className="hover:text-flame">
                      {item.event.name}
                    </Link>
                  </h2>
                  <p className="mt-2 text-xs leading-6 text-muted">
                    {item.event.startsAt
                      ? formatDateTime(item.event.startsAt, data.eventTimezone)
                      : "Time to be announced"}
                    {item.event.venue ? ` · ${item.event.venue}` : ""}
                  </p>
                  {item.event.description ? (
                    <p className="mt-3 text-sm leading-7 text-ink-soft">{item.event.description}</p>
                  ) : null}
                </div>

                <div className="border-t border-line pt-4">
                  {item.visibility === "none" ? (
                    <div className="border border-dashed border-line px-5 py-8">
                      <p className="text-sm font-semibold">Results are not public yet.</p>
                      <p className="mt-1 text-sm leading-7 text-muted">
                        {item.event.resultStatus === "not_ready"
                          ? "Scoring has not been published for this event."
                          : "Provisional results are hidden by the organizers."}
                      </p>
                    </div>
                  ) : (
                    <>
                      {item.visibility === "provisional" ? (
                        <p className="mb-3 border-l-2 border-gold bg-gold/[0.08] px-3 py-2 text-xs text-ink-soft">
                          Provisional — these points may change before finalization.
                        </p>
                      ) : null}
                      <StandingsTable rows={item.results} compact />
                    </>
                  )}
                </div>
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}
