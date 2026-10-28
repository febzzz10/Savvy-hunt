"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ScoreEditor } from "@/components/admin/score-editor";
import { StatusPill } from "@/components/status-pill";

type EventRow = {
  _id: Id<"events">;
  name: string;
  categoryName: string;
  status: string;
  publicationStatus: string;
  resultStatus: string;
};

export default function AdminScoresPage() {
  const events = useQuery(api.admin.listEvents);
  const [selectedId, setSelectedId] = useState("");

  if (events === undefined) {
    return <div className="h-64 animate-pulse border border-line bg-white/40" />;
  }

  if (events.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="display text-2xl">No events to score yet.</p>
        <Link href="/admin/events/new" className="btn btn-primary mt-5">
          Create an event
        </Link>
      </div>
    );
  }

  const activeId = (selectedId || events[0]._id) as Id<"events">;
  const selected = events.find((event: EventRow) => event._id === activeId) ?? events[0];

  return (
    <div>
      <header>
        <p className="eyebrow text-flame">Points desk</p>
        <h1 className="display mt-3 text-4xl md:text-5xl">Scores</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
          One score per school per event. Drafts never appear publicly; published scores do.
        </p>
      </header>

      <div className="card mt-6 flex flex-wrap items-end justify-between gap-4 p-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="score-event" className="label">
            Event
          </label>
          <select
            id="score-event"
            className="select"
            value={activeId}
            onChange={(inputEvent) => setSelectedId(inputEvent.target.value)}
          >
            {events.map((event: EventRow) => (
              <option key={event._id} value={event._id}>
                {event.name} — {event.categoryName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={selected.status} />
          <StatusPill status={selected.resultStatus} />
          <Link href={`/admin/events/${selected._id}`} className="btn btn-ghost">
            Event settings
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <ScoreEditor eventId={activeId} />
      </div>
    </div>
  );
}
