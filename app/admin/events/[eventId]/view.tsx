"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { EventDetailsForm } from "@/components/admin/event-details-form";
import { EventControls } from "@/components/admin/event-controls";
import { ResultControls } from "@/components/admin/result-controls";
import { ScoreEditor } from "@/components/admin/score-editor";
import { StatusPill } from "@/components/status-pill";

export function AdminEventView({ eventId }: { eventId: Id<"events"> }) {
  const event = useQuery(api.admin.getAdminEvent, { eventId });
  const categories = useQuery(api.admin.listCategories);
  const settings = useQuery(api.admin.getAdminSettings);

  if (event === undefined || categories === undefined || settings === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 bg-paper-deep" />
        <div className="h-12 w-80 bg-paper-deep" />
        <div className="h-72 border border-line bg-white/40" />
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="card p-10 text-center">
        <p className="display text-2xl">That event does not exist.</p>
        <Link href="/admin/events" className="btn btn-ghost mt-5">
          Back to events
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/events" className="text-xs font-bold uppercase tracking-wider text-muted hover:text-ink">
        ← All events
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-flame">{event.categoryName}</p>
          <h1 className="display mt-2 text-4xl md:text-5xl">{event.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill status={event.status} />
          <StatusPill status={event.publicationStatus} />
          <StatusPill status={event.resultStatus} />
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <EventDetailsForm
            key={event.updatedAt}
            event={event}
            categories={categories}
            timezone={settings.eventTimezone}
          />

          <div id="scores" className="scroll-mt-24">
            <ScoreEditor eventId={event._id} />
          </div>
        </div>

        <aside className="space-y-6">
          <div id="results" className="scroll-mt-24">
            <ResultControls event={event} />
          </div>
          <EventControls event={event} />

          {event.publicationStatus === "published" ? (
            <Link href={`/events/${event._id}`} className="btn btn-ghost w-full" target="_blank">
              Open public page →
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
