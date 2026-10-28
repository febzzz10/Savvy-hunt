"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { StatusPill } from "@/components/status-pill";
import { formatTimeAgo } from "@/lib/format";

export default function AdminDashboardPage() {
  const data = useQuery(api.admin.adminDashboard);

  if (data === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-40 bg-paper-deep" />
        <div className="h-12 w-72 bg-paper-deep" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 border border-line bg-white/40" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Live now", value: data.events.live, href: "/admin/events", tone: "text-flame" },
    { label: "Draft events", value: data.events.drafts, href: "/admin/events", tone: "text-ink" },
    {
      label: "Awaiting final results",
      value: data.events.awaitingResults,
      href: "/admin/results",
      tone: "text-gold",
    },
    {
      label: "Photos to review",
      value: data.gallery.pending,
      href: "/admin/gallery",
      tone: "text-teal",
    },
  ];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-flame">Organizer desk</p>
          <h1 className="display mt-3 text-4xl md:text-5xl">Running the hunt.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            Publish carefully. Every public change reaches every open scoreboard immediately.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/events" className="btn btn-primary">
            Manage events
          </Link>
          <Link href="/" className="btn btn-ghost">
            View site
          </Link>
        </div>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="card group p-5 transition-colors hover:border-ink"
          >
            <p className="eyebrow text-muted">{card.label}</p>
            <p className={`display mt-4 text-5xl tabular-nums ${card.tone}`}>{card.value}</p>
            <p className="mt-3 text-xs text-muted group-hover:text-flame">Open →</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="card p-5 md:p-6">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
            <h2 className="display text-2xl">Drive sync</h2>
            <Link href="/admin/gallery" className="text-xs font-bold uppercase tracking-wider text-teal hover:underline">
              Gallery
            </Link>
          </div>
          {data.lastSync ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={data.lastSync.status === "success" ? "published" : data.lastSync.status} />
                <span className="text-xs text-muted">
                  {formatTimeAgo(data.lastSync.finishedAt ?? data.lastSync.startedAt)}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="eyebrow text-muted">Seen</dt>
                  <dd className="mt-1 text-xl tabular-nums">{data.lastSync.filesSeen}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-muted">Added</dt>
                  <dd className="mt-1 text-xl tabular-nums">{data.lastSync.filesAdded}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-muted">Updated</dt>
                  <dd className="mt-1 text-xl tabular-nums">{data.lastSync.filesUpdated}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-muted">Failed</dt>
                  <dd className="mt-1 text-xl tabular-nums">{data.lastSync.filesFailed}</dd>
                </div>
              </dl>
              {data.lastSync.safeErrorSummary ? (
                <p className="mt-3 text-xs text-flame">
                  Last sync code: {data.lastSync.safeErrorSummary}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-muted">No gallery sync has run yet.</p>
              <Link href="/admin/gallery" className="btn btn-ghost mt-4">
                Configure and sync
              </Link>
            </div>
          )}
        </section>

        <section className="card p-5 md:p-6">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
            <h2 className="display text-2xl">At a glance</h2>
            <Link href="/admin/audit" className="text-xs font-bold uppercase tracking-wider text-teal hover:underline">
              Audit
            </Link>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Active schools</dt>
              <dd className="font-semibold tabular-nums">
                {data.schools.active} / {data.schools.total}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Active categories</dt>
              <dd className="font-semibold tabular-nums">
                {data.categories.active} / {data.categories.total}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Published photos</dt>
              <dd className="font-semibold tabular-nums">{data.gallery.published}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Gallery failures</dt>
              <dd className="font-semibold tabular-nums text-flame">{data.gallery.failed}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Total events</dt>
              <dd className="font-semibold tabular-nums">{data.events.total}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="card mt-6 p-5 md:p-6">
        <h2 className="display text-2xl">Recent activity</h2>
        {data.recentAudit.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No admin actions recorded yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {data.recentAudit.map((entry: {
              _id: Id<"auditLogs">;
              action: string;
              entityType: string;
              detail?: string | null;
              actorSubject: string;
              createdAt: number;
            }) => (
              <li key={entry._id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                <span>
                  <span className="font-semibold">{entry.action.replaceAll("_", " ")}</span>{" "}
                  <span className="text-muted">{entry.entityType}</span>
                  {entry.detail ? <span className="text-muted"> · {entry.detail}</span> : null}
                </span>
                <span className="text-xs text-muted">{formatTimeAgo(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
