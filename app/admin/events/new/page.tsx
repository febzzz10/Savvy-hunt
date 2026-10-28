"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { EventDetailsForm } from "@/components/admin/event-details-form";

export default function NewEventPage() {
  const categories = useQuery(api.admin.listCategories);
  const settings = useQuery(api.admin.getAdminSettings);

  if (categories === undefined || settings === undefined) {
    return <div className="h-64 animate-pulse border border-line bg-white/40" />;
  }

  const activeCategories = categories.filter(
    (category: { _id: string; name: string; isActive: boolean }) => category.isActive,
  );

  return (
    <div className="max-w-3xl">
      <Link href="/admin/events" className="text-xs font-bold uppercase tracking-wider text-muted hover:text-ink">
        ← All events
      </Link>
      <h1 className="display mt-4 text-4xl">Add an event.</h1>
      <p className="mt-2 text-sm text-muted">
        Drafts stay invisible until you publish them. Scores can be prepared beforehand.
      </p>

      {activeCategories.length === 0 ? (
        <div className="card mt-8 p-8">
          <p className="display text-2xl">A category is needed first.</p>
          <p className="mt-2 text-sm text-muted">
            Every event belongs to a category. Add one in the catalog, then come back.
          </p>
          <Link href="/admin/catalog" className="btn btn-primary mt-5">
            Open catalog
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <EventDetailsForm categories={categories} timezone={settings.eventTimezone} />
        </div>
      )}
    </div>
  );
}
