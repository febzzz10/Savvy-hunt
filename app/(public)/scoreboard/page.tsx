"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/empty-state";
import { StandingsTable } from "@/components/standings-table";
import { formatTimeAgo } from "@/lib/format";

export default function ScoreboardPage() {
  const [categoryId, setCategoryId] = useState<Id<"categories"> | null>(null);
  const categories = useQuery(api.public.getCategories);
  const data = useQuery(api.public.getScoreboard, {
    categoryId: categoryId ?? undefined,
  });

  return (
    <div className="shell pb-20 pt-12 md:pt-16">
      <header className="grid gap-8 border-b border-line pb-10 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
        <div>
          <p className="eyebrow text-flame">Standings</p>
          <h1 className="display mt-4 text-[clamp(3rem,7vw,5.6rem)]">The board.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted md:text-base">
            Every published point, added up. Provisional results are marked; final results
            stay in place. Equal totals share a rank.
          </p>
        </div>
        <div className="border border-line bg-white/40 p-5">
          <p className="eyebrow text-muted">Reading the board</p>
          <p className="mt-3 text-sm leading-7 text-ink-soft">
            {data?.provisional
              ? "A provisional result is on the board. The standing may move before it is finalized."
              : "All visible results are final or the provisional window has closed."}
          </p>
          {data ? (
            <p className="mt-3 text-xs text-muted">
              {data.contributingEvents} contributing {data.contributingEvents === 1 ? "event" : "events"}
              {" · "}updated {formatTimeAgo(data.updatedAt)}
            </p>
          ) : null}
        </div>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCategoryId(null)}
          className={`border px-3.5 py-2 text-[0.68rem] font-bold uppercase tracking-[0.13em] transition-colors ${
            categoryId === null
              ? "border-ink bg-ink text-paper"
              : "border-line text-muted hover:border-ink hover:text-ink"
          }`}
        >
          Overall
        </button>
        {(categories ?? []).map((category: { _id: Id<"categories">; name: string }) => (
          <button
            key={category._id}
            type="button"
            onClick={() => setCategoryId(category._id)}
            className={`border px-3.5 py-2 text-[0.68rem] font-bold uppercase tracking-[0.13em] transition-colors ${
              categoryId === category._id
                ? "border-ink bg-ink text-paper"
                : "border-line text-muted hover:border-ink hover:text-ink"
            }`}
          >
            {category.name}
          </button>
        ))}
        <Link
          href="/scoreboard/categories"
          className="ml-auto text-xs font-bold uppercase tracking-[0.13em] text-teal hover:underline"
        >
          Category results →
        </Link>
      </div>

      {data === undefined ? (
        <div className="mt-8 animate-pulse space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-16 border border-line bg-white/40" />
          ))}
        </div>
      ) : data.standings.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No points on the board yet."
            copy="Standings appear when an event publishes its first result. Check the schedule while the competition gets underway."
            action={
              <Link href="/schedule" className="btn btn-primary">
                View schedule
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {data.provisional ? (
            <div className="mt-8 border-l-2 border-gold bg-gold/[0.08] px-4 py-3 text-sm text-ink-soft">
              <strong className="font-semibold text-gold">Provisional result:</strong> this board
              includes at least one result that organizers have not finalized.
            </div>
          ) : null}
          <div className="mt-8">
            <StandingsTable rows={data.standings} />
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
            <span>
              {data.category ? `${data.category.name} category` : "All categories"}
              {" · "}times in {data.eventTimezone}
            </span>
            <Link href="/scoreboard/categories" className="font-bold uppercase tracking-[0.12em] text-teal hover:underline">
              Browse event results
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
