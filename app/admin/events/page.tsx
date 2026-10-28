"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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

export default function AdminEventsPage() {
  const events = useQuery(api.admin.listEvents);
  const settings = useQuery(api.admin.getAdminSettings);

  if (events === undefined || settings === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 bg-paper-deep" />
        <div className="h-12 w-64 bg-paper-deep" />
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 border border-line bg-white/40" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-flame">Program</p>
          <h1 className="display mt-3 text-4xl md:text-5xl">Events</h1>
          <p className="mt-2 max-w-xl text-sm leading-7 text-muted">
            Create the programme, move events through their lifecycle, and publish results.
          </p>
        </div>
        <Link href="/admin/events/new" className="btn btn-primary">
          New event
        </Link>
      </header>

      {events.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="display text-2xl">No events yet.</p>
          <p className="mt-2 text-sm text-muted">
            Add the first event to start building the programme.
          </p>
          <Link href="/admin/events/new" className="btn btn-primary mt-5">
            Create an event
          </Link>
        </div>
      ) : (
        <div className="card mt-8 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Starts</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Publication</th>
                <th className="px-4 py-3 font-semibold">Results</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.map((event: EventRow) => (
                <tr key={event._id} className="group hover:bg-paper-deep/30">
                  <td className="px-4 py-4">
                    <Link href={`/admin/events/${event._id}`} className="font-semibold hover:text-flame">
                      {event.name}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-muted">{event.categoryName}</td>
                  <td className="px-4 py-4 tabular-nums text-muted">
                    {event.startsAt
                      ? formatDateTime(event.startsAt, settings.eventTimezone)
                      : "Not scheduled"}
                  </td>
                  <td className="px-4 py-4">
                    <StatusPill status={event.status} />
                  </td>
                  <td className="px-4 py-4">
                    <StatusPill status={event.publicationStatus} />
                  </td>
                  <td className="px-4 py-4">
                    <StatusPill status={event.resultStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
