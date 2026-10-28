"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Feedback } from "@/components/admin/feedback";
import { getErrorMessage } from "@/lib/errors";
import {
  isAllowedEventTransition,
  isRestrictedEventTransition,
  type EventStatus,
} from "@/convex/lib/scoring";

type EventLike = {
  _id: Id<"events">;
  name: string;
  status: string;
  publicationStatus: string;
};

const STATUS_OPTIONS: EventStatus[] = [
  "upcoming",
  "live",
  "paused",
  "postponed",
  "completed",
  "cancelled",
];

const PUBLICATION_NEXT: Record<string, string[]> = {
  draft: ["published"],
  published: ["draft", "archived"],
  archived: ["draft"],
};

export function EventControls({ event }: { event: EventLike }) {
  const setStatus = useMutation(api.admin.setEventStatus);
  const setPublication = useMutation(api.admin.setEventPublication);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState("");
  const [nextPublication, setNextPublication] = useState("");

  const allowedStatuses = STATUS_OPTIONS.filter((status) =>
    isAllowedEventTransition(event.status as EventStatus, status),
  );
  const allowedPublications = PUBLICATION_NEXT[event.publicationStatus] ?? [];

  async function changeStatus() {
    if (!nextStatus) return;
    setError(null);
    setSuccess(null);
    let reason: string | undefined;
    if (isRestrictedEventTransition(event.status as EventStatus, nextStatus as EventStatus)) {
      const answer = window.prompt(
        `Why are you reopening this ${event.status} event? This reason is recorded in the audit log.`,
      );
      if (answer === null) return;
      if (!answer.trim()) {
        setError("A reason is required for this transition.");
        return;
      }
      reason = answer;
    }
    setPending(true);
    try {
      await setStatus({
        eventId: event._id,
        status: nextStatus as never,
        reason,
      });
      setSuccess(`Event is now ${nextStatus}.`);
      setNextStatus("");
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    } finally {
      setPending(false);
    }
  }

  async function changePublication() {
    if (!nextPublication) return;
    setError(null);
    setSuccess(null);
    let reason: string | undefined;
    if (event.publicationStatus === "published") {
      const answer = window.prompt(
        "Why are you removing this event from public view? This reason is recorded in the audit log.",
      );
      if (answer === null) return;
      if (!answer.trim()) {
        setError("A reason is required to unpublish or archive a public event.");
        return;
      }
      reason = answer;
    }
    setPending(true);
    try {
      await setPublication({
        eventId: event._id,
        publicationStatus: nextPublication as never,
        reason,
      });
      setSuccess(
        nextPublication === "published"
          ? "Event is now public."
          : `Event moved to ${nextPublication}.`,
      );
      setNextPublication("");
    } catch (publicationError) {
      setError(getErrorMessage(publicationError));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card p-5 md:p-6">
      <h2 className="display text-2xl">Lifecycle</h2>
      <Feedback error={error} success={success} />

      <div className="mt-4 space-y-5">
        <div>
          <p className="label">Event status</p>
          <div className="flex gap-2">
            <select
              className="select"
              value={nextStatus}
              onChange={(inputEvent) => setNextStatus(inputEvent.target.value)}
              aria-label="New event status"
            >
              <option value="">Move to…</option>
              {allowedStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-ghost shrink-0"
              disabled={!nextStatus || pending}
              onClick={changeStatus}
            >
              Apply
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Public status changes appear immediately. Reopening a completed or cancelled event
            asks for a reason.
          </p>
        </div>

        <div className="border-t border-line pt-4">
          <p className="label">Publication</p>
          <div className="flex gap-2">
            <select
              className="select"
              value={nextPublication}
              onChange={(inputEvent) => setNextPublication(inputEvent.target.value)}
              aria-label="New publication status"
            >
              <option value="">Move to…</option>
              {allowedPublications.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-ghost shrink-0"
              disabled={!nextPublication || pending}
              onClick={changePublication}
            >
              Apply
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Draft and archived events are invisible to the public. Unpublishing a live event
            asks for a reason.
          </p>
        </div>
      </div>
    </div>
  );
}
