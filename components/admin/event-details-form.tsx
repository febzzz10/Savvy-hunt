"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Feedback } from "@/components/admin/feedback";
import { getErrorMessage } from "@/lib/errors";
import { dateInputValue, parseDateTimeInput } from "@/lib/format";

type EventLike = {
  _id: Id<"events">;
  name: string;
  categoryId: string;
  description?: string | null;
  venue?: string | null;
  startsAt?: number | null;
  endsAt?: number | null;
  updatedAt?: number;
};

type CategoryLike = { _id: string; name: string; isActive: boolean };

export function EventDetailsForm({
  event,
  categories,
  timezone,
}: {
  event?: EventLike;
  categories: CategoryLike[];
  timezone: string;
}) {
  const router = useRouter();
  const createEvent = useMutation(api.admin.createEvent);
  const updateEvent = useMutation(api.admin.updateEventDetails);
  const [name, setName] = useState(event?.name ?? "");
  const [categoryId, setCategoryId] = useState(
    event?.categoryId ?? categories.find((category) => category.isActive)?._id ?? "",
  );
  const [description, setDescription] = useState(event?.description ?? "");
  const [venue, setVenue] = useState(event?.venue ?? "");
  const [startsAt, setStartsAt] = useState(dateInputValue(event?.startsAt, timezone));
  const [endsAt, setEndsAt] = useState(dateInputValue(event?.endsAt, timezone));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    setSuccess(null);
    if (!name.trim()) {
      setError("Event name is required.");
      return;
    }
    if (!categoryId) {
      setError("Choose a category.");
      return;
    }
    const startValue = startsAt ? parseDateTimeInput(startsAt, timezone) : null;
    const endValue = endsAt ? parseDateTimeInput(endsAt, timezone) : null;
    if (startsAt && startValue === null) {
      setError("Start time is not a valid date and time.");
      return;
    }
    if (endsAt && endValue === null) {
      setError("End time is not a valid date and time.");
      return;
    }
    if (startValue !== null && endValue !== null && endValue < startValue) {
      setError("End time cannot be before start time.");
      return;
    }

    setPending(true);
    try {
      if (event) {
        await updateEvent({
          eventId: event._id,
          name: name.trim(),
          categoryId: categoryId as never,
          description: description.trim(),
          venue: venue.trim(),
          startsAt: startValue,
          endsAt: endValue,
        });
        setSuccess("Event details saved.");
      } else {
        const eventId = await createEvent({
          name: name.trim(),
          categoryId: categoryId as never,
          description: description.trim(),
          venue: venue.trim(),
          ...(startValue !== null ? { startsAt: startValue } : {}),
          ...(endValue !== null ? { endsAt: endValue } : {}),
        });
        router.push(`/admin/events/${eventId}`);
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 md:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
        <h2 className="display text-2xl">{event ? "Event details" : "New event"}</h2>
        <span className="text-xs text-muted">Times in {timezone}</span>
      </div>
      <Feedback error={error} success={success} />

      <div className="mt-4 grid gap-4">
        <div>
          <label htmlFor="event-name" className="label">
            Event name
          </label>
          <input
            id="event-name"
            className="input"
            value={name}
            onChange={(inputEvent) => setName(inputEvent.target.value)}
            maxLength={160}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="event-category" className="label">
              Category
            </label>
            <select
              id="event-category"
              className="select"
              value={categoryId}
              onChange={(inputEvent) => setCategoryId(inputEvent.target.value)}
              required
            >
              <option value="">Choose a category</option>
              {categories
                .filter((category) => category.isActive || category._id === event?.categoryId)
                .map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                    {!category.isActive ? " (archived)" : ""}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="event-venue" className="label">
              Venue
            </label>
            <input
              id="event-venue"
              className="input"
              value={venue}
              onChange={(inputEvent) => setVenue(inputEvent.target.value)}
              maxLength={160}
              placeholder="Main auditorium"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="event-start" className="label">
              Starts
            </label>
            <input
              id="event-start"
              type="datetime-local"
              className="input"
              value={startsAt}
              onChange={(inputEvent) => setStartsAt(inputEvent.target.value)}
            />
          </div>
          <div>
            <label htmlFor="event-end" className="label">
              Ends
            </label>
            <input
              id="event-end"
              type="datetime-local"
              className="input"
              value={endsAt}
              onChange={(inputEvent) => setEndsAt(inputEvent.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="event-description" className="label">
            Public description
          </label>
          <textarea
            id="event-description"
            className="textarea"
            value={description}
            onChange={(inputEvent) => setDescription(inputEvent.target.value)}
            maxLength={2000}
            placeholder="What should the audience know?"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-xs text-muted">
          {event ? "Name changes are audited." : "New events start as drafts."}
        </p>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : event ? "Save details" : "Create draft"}
        </button>
      </div>
    </form>
  );
}
