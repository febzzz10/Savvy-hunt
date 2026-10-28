"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SmartImage } from "@/components/smart-image";
import { StandingsTable } from "@/components/standings-table";
import { StatusPill } from "@/components/status-pill";
import { formatDayLabel, formatNumber, formatShortDate, formatTime, formatTimeAgo } from "@/lib/format";

export default function HomePage() {
  const data = useQuery(api.public.getHome);

  if (data === undefined) return <HomeSkeleton />;

  const featuredLive = data.liveEvents[0] ?? null;
  const nextUp = data.upcomingEvents[0] ?? null;
  const timezone = data.eventTimezone;

  return (
    <>
      {data.liveEvents.length > 0 ? (
        <div className="border-b border-flame/30 bg-flame text-paper">
          <div className="shell flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-[0.7rem] font-bold uppercase tracking-[0.14em]">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Live now
            </span>
            <span className="hidden h-3 w-px bg-white/40 sm:block" />
            <span className="normal-case tracking-normal">
              {data.liveEvents.map((event: { name: string }) => event.name).join(" · ")}
            </span>
            <Link href="/scoreboard" className="ml-auto underline underline-offset-4">
              View board
            </Link>
          </div>
        </div>
      ) : null}

      <section className="shell pt-12 md:pt-20">
        <div className="grid gap-12 border-b border-line pb-14 lg:grid-cols-[1.45fr_0.55fr] lg:gap-16">
          <div>
            <p className="eyebrow text-flame">The annual inter-school championship</p>
            <h1 className="display mt-5 text-[clamp(3.6rem,10vw,8rem)]">
              Every point.
              <br />
              <span className="italic text-flame">On the record.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-ink-soft md:text-lg">
              Live scores, verified results, and the moments between events. Follow every
              school as the Savvy Hunt unfolds — no group chats, no screenshots, no waiting
              for the notice board.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/scoreboard" className="btn btn-primary">
                See the scoreboard
              </Link>
              <Link href="/schedule" className="btn btn-ghost">
                Full schedule
              </Link>
            </div>
            <p className="mt-5 text-xs text-muted">
              Updated {formatTimeAgo(data.updatedAt)}
              {data.provisional ? " · includes provisional results" : ""}
            </p>
          </div>

          <aside className="card flex flex-col justify-between p-6 md:p-8">
            <div>
              <p className="eyebrow text-muted">{featuredLive ? "On stage now" : "Next on the calendar"}</p>
              {featuredLive ? (
                <>
                  <div className="mt-4">
                    <StatusPill status={featuredLive.status} />
                  </div>
                  <p className="display mt-4 text-3xl leading-[1.02]">{featuredLive.name}</p>
                  <p className="mt-2 text-sm text-muted">{featuredLive.categoryName}</p>
                </>
              ) : nextUp ? (
                <>
                  <p className="display mt-4 text-3xl leading-[1.02]">{nextUp.name}</p>
                  <p className="mt-3 text-sm text-muted">
                    {nextUp.startsAt
                      ? `${formatDayLabel(nextUp.startsAt, timezone)} · ${formatTime(nextUp.startsAt, timezone)}`
                      : "Time to be announced"}
                  </p>
                  <p className="mt-1 text-sm text-muted">{nextUp.venue ?? nextUp.categoryName}</p>
                </>
              ) : (
                <>
                  <p className="display mt-4 text-3xl leading-[1.02]">The stage is being set.</p>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    The next event will appear here as soon as organizers publish it.
                  </p>
                </>
              )}
            </div>
            <div className="mt-8 border-t border-line pt-5">
              <Link
                href={featuredLive ? "/scoreboard" : "/schedule"}
                className="text-xs font-bold uppercase tracking-[0.14em] text-teal underline-offset-4 hover:underline"
              >
                {featuredLive ? "Open live scoreboard →" : "See the full schedule →"}
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="shell py-10">
        <dl className="grid grid-cols-2 gap-y-8 md:grid-cols-4">
          {[
            ["Schools", data.stats.schools],
            ["Categories", data.stats.categories],
            ["Public events", data.stats.events],
            ["Photographs", data.stats.photos],
          ].map(([label, value], index) => (
            <div
              key={String(label)}
              className={`border-line ${index > 0 ? "md:border-l md:pl-8" : ""} ${
                index % 2 === 1 ? "border-l pl-6 md:pl-8" : ""
              }`}
            >
              <dt className="eyebrow text-muted">{label}</dt>
              <dd className="display mt-2 text-4xl tabular-nums md:text-5xl">
                {formatNumber(Number(value))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="shell mt-10 md:mt-16">
        <div className="grid gap-12 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
              <div>
                <p className="eyebrow text-flame">The board</p>
                <h2 className="display mt-2 text-4xl md:text-5xl">Schools in the running</h2>
              </div>
              <Link
                href="/scoreboard"
                className="text-xs font-bold uppercase tracking-[0.14em] text-teal underline-offset-4 hover:underline"
              >
                Full standings →
              </Link>
            </div>
            <div className="mt-6">
              <StandingsTable rows={data.standingsTop} compact />
            </div>
          </div>
          <aside className="card h-fit p-6 md:p-8">
            <p className="eyebrow text-muted">How the hunt is scored</p>
            <ol className="mt-5 space-y-4 text-sm leading-7 text-ink-soft">
              <li className="flex gap-3">
                <span className="display text-xl text-flame">01</span>
                <span>Only published, verified results count toward the school total.</span>
              </li>
              <li className="flex gap-3">
                <span className="display text-xl text-flame">02</span>
                <span>Provisional results are visible but marked until organizers finalize them.</span>
              </li>
              <li className="flex gap-3">
                <span className="display text-xl text-flame">03</span>
                <span>Equal points share the same rank. No invented tiebreakers.</span>
              </li>
            </ol>
            <Link
              href="/scoreboard/categories"
              className="btn btn-ghost mt-6 w-full"
            >
              Browse by category
            </Link>
          </aside>
        </div>
      </section>

      <section className="shell mt-20 grid gap-12 lg:grid-cols-2">
        <div>
          <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
            <h2 className="display text-3xl md:text-4xl">Latest results</h2>
            <Link
              href="/scoreboard"
              className="text-xs font-bold uppercase tracking-[0.14em] text-teal hover:underline"
            >
              All results
            </Link>
          </div>
          {data.recentResults.length === 0 ? (
            <p className="mt-6 text-sm text-muted">Results will appear here once published.</p>
          ) : (
            <ul className="mt-2">
              {data.recentResults.map((result: {
                _id: string;
                name: string;
                resultStatus: string;
                resultsPublishedAt: number | null;
                categoryName: string | null;
              }) => (
                <li key={result._id} className="border-b border-line">
                  <Link
                    href={`/events/${result._id}`}
                    className="group flex items-center gap-4 py-4"
                  >
                    <div className="w-14 shrink-0">
                      <p className="display text-2xl text-muted">
                        {result.resultsPublishedAt
                          ? formatShortDate(result.resultsPublishedAt, timezone)
                          : "—"}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold group-hover:text-flame">
                        {result.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{result.categoryName}</p>
                    </div>
                    <StatusPill status={result.resultStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
            <h2 className="display text-3xl md:text-4xl">Coming up</h2>
            <Link
              href="/schedule"
              className="text-xs font-bold uppercase tracking-[0.14em] text-teal hover:underline"
            >
              Schedule
            </Link>
          </div>
          {data.upcomingEvents.length === 0 ? (
            <p className="mt-6 text-sm text-muted">Nothing scheduled just yet.</p>
          ) : (
            <ul className="mt-2">
              {data.upcomingEvents.map((event: {
                _id: string;
                name: string;
                startsAt: number | null;
                venue: string | null;
                status: string;
                categoryName: string | null;
              }) => (
                <li key={event._id} className="border-b border-line">
                  <Link href={`/events/${event._id}`} className="group flex gap-4 py-4">
                    <div className="flex w-14 shrink-0 flex-col items-center border border-line py-2">
                      <span className="display text-xl leading-none">
                        {event.startsAt ? formatShortDate(event.startsAt, timezone).split(" ")[0] : "—"}
                      </span>
                      <span className="mt-1 text-[0.6rem] font-bold uppercase tracking-widest text-muted">
                        {event.startsAt ? formatShortDate(event.startsAt, timezone).split(" ")[1] : "TBA"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold group-hover:text-flame">
                        {event.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {event.categoryName}
                        {event.venue ? ` · ${event.venue}` : ""}
                        {event.startsAt ? ` · ${formatTime(event.startsAt, timezone)}` : ""}
                      </p>
                    </div>
                    <StatusPill status={event.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {data.galleryPreview.length > 0 ? (
        <section className="shell mt-20">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
            <div>
              <p className="eyebrow text-flame">The gallery</p>
              <h2 className="display mt-2 text-4xl md:text-5xl">Between the events</h2>
            </div>
            <Link
              href="/gallery"
              className="text-xs font-bold uppercase tracking-[0.14em] text-teal hover:underline"
            >
              Open gallery →
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {data.galleryPreview.map(
              (
                item: { _id: string; url: string | null; altText: string },
                index: number,
              ) => (
                <Link
                  key={item._id}
                  href="/gallery"
                  className={`relative overflow-hidden bg-paper-deep ${
                    index === 0 ? "col-span-2 aspect-[4/3] md:row-span-2 md:aspect-square" : "aspect-square"
                  }`}
                >
                  <SmartImage
                    src={item.url}
                    alt={item.altText}
                    sizes={index === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
                    className="object-cover transition-transform duration-500 hover:scale-[1.03]"
                  />
                </Link>
              ),
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="shell animate-pulse pt-16">
      <div className="h-3 w-52 bg-paper-deep" />
      <div className="mt-6 h-20 w-4/5 max-w-4xl bg-paper-deep md:h-32" />
      <div className="mt-4 h-20 w-3/5 max-w-2xl bg-paper-deep md:h-32" />
      <div className="mt-8 h-4 w-80 max-w-full bg-paper-deep" />
      <div className="mt-10 grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 border border-line bg-white/40" />
        ))}
      </div>
    </div>
  );
}
