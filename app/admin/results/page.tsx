"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ResultControls } from "@/components/admin/result-controls";
import { StatusPill } from "@/components/status-pill";
import { formatDateTime } from "@/lib/format";

type EventRow = {
  _id: Id<"events">;
  name: string;
  categoryName: string;
  startsAt?: number;
  status: string;
  publicationStatus: string;
  resultStatus: string;
};

export default function AdminResultsPage() {
  const events = useQuery(api.admin.listEvents);
  const settings = useQuery(api.admin.getAdminSettings);
  const [selectedId, setSelectedId] = useState("");

  if (events === undefined || settings === undefined) {
    return <div className="h-64 animate-pulse border border-line bg-white/40" />;
  }

  const pending = events.filter(
    (event: EventRow) =>
      event.status !== "cancelled" &&
      event.publicationStatus === "published" &&
      event.resultStatus !== "final",
  );

  if (events.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="display text-2xl">No events yet.</p>
        <Link href="/admin/events/new" className="btn btn-primary mt-5">
          Create an event
        </Link>
      </div>
    );
  }

  const activeId = selectedId || pending[0]?._id || events[0]._id;
  const selected = events.find((event: EventRow) => event._id === activeId) ?? events[0];

  return (
    <div>
      <header>
        <p className="eyebrow text-flame">Publication desk</p>
        <h1 className="display mt-3 text-4xl md:text-5xl">Results</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
          Provisional results can still change. Final results are locked and reopen with an
          audited reason.
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
            <h2 className="display text-2xl">Awaiting final</h2>
            <span className="text-xs tabular-nums text-muted">{pending.length}</span>
          </div>
          {pending.length === 0 ? (
            <p className="py-6 text-sm text-muted">
              No published events are waiting for final results.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {pending.map((event: EventRow) => (
                <li key={event._id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(event._id)}
                    className={`block w-full py-3 text-left hover:text-flame ${
                      event._id === activeId ? "text-flame" : ""
                    }`}
                  >
                    <span className="block text-sm font-semibold">{event.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      {event.categoryName}
                      <StatusPill status={event.resultStatus} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 md:p-6">
          <label htmlFor="result-event" className="label">
            Event
          </label>
          <select
            id="result-event"
            className="select"
            value={activeId}
            onChange={(inputEvent) => setSelectedId(inputEvent.target.value)}
          >
            {events.map((event: EventRow) => (
              <option key={event._id} value={event._id}>
                {event.name} — {event.resultStatus.replaceAll("_", " ")}
              </option>
            ))}
          </select>

          <div className="mt-5 border-t border-line pt-4">
            <p className="display text-2xl">{selected.name}</p>
            <p className="mt-1 text-xs text-muted">
              {selected.categoryName}
              {selected.startsAt
                ? ` · ${formatDateTime(selected.startsAt, settings.eventTimezone)}`
                : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill status={selected.status} />
              <StatusPill status={selected.publicationStatus} />
              <StatusPill status={selected.resultStatus} />
            </div>
          </div>

          <div className="mt-5">
            <ResultControls event={selected} compact />
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <Link href={`/admin/events/${selected._id}`} className="btn btn-ghost">
              Event settings
            </Link>
            {selected.publicationStatus === "published" ? (
              <Link href={`/events/${selected._id}`} className="btn btn-ghost" target="_blank">
                Public page →
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
