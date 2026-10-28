"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Feedback } from "@/components/admin/feedback";
import { getErrorMessage } from "@/lib/errors";

type ResultEvent = {
  _id: Id<"events">;
  name: string;
  publicationStatus: string;
  resultStatus: string;
};

export function ResultControls({
  event,
  compact = false,
}: {
  event: ResultEvent;
  compact?: boolean;
}) {
  const setResultStatus = useMutation(api.admin.setResultStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isPublic = event.publicationStatus === "published";

  async function change(next: "provisional" | "final" | "not_ready") {
    setError(null);
    setSuccess(null);
    let reason: string | undefined;
    if (event.resultStatus === "final" || next === "not_ready") {
      const answer = window.prompt(
        "Why are you reopening or hiding these results? This reason is recorded in the audit log.",
      );
      if (answer === null) return;
      if (!answer.trim()) {
        setError("A reason is required for this result change.");
        return;
      }
      reason = answer;
    }
    setPending(true);
    try {
      await setResultStatus({
        eventId: event._id,
        resultStatus: next as never,
        reason,
      });
      setSuccess(
        next === "final"
          ? "Results finalized."
          : next === "provisional"
            ? "Results published as provisional."
            : "Results hidden.",
      );
    } catch (resultError) {
      setError(getErrorMessage(resultError));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={compact ? "" : "card p-5 md:p-6"}>
      {!compact ? <h2 className="display text-2xl">Results</h2> : null}
      <Feedback error={error} success={success} />
      {!isPublic ? (
        <p className="mt-3 text-xs text-gold">
          Publish the event before making results public.
        </p>
      ) : null}
      <div className={`flex flex-wrap gap-2 ${compact ? "mt-0" : "mt-4"}`}>
        {event.resultStatus === "not_ready" ? (
          <>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!isPublic || pending}
              onClick={() => change("provisional")}
            >
              Publish provisional
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!isPublic || pending}
              onClick={() => change("final")}
            >
              Publish final
            </button>
          </>
        ) : null}
        {event.resultStatus === "provisional" ? (
          <>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!isPublic || pending}
              onClick={() => change("final")}
            >
              Finalize results
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!isPublic || pending}
              onClick={() => change("not_ready")}
            >
              Hide results
            </button>
          </>
        ) : null}
        {event.resultStatus === "final" ? (
          <>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!isPublic || pending}
              onClick={() => change("provisional")}
            >
              Reopen as provisional
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={!isPublic || pending}
              onClick={() => change("not_ready")}
            >
              Reset to not ready
            </button>
          </>
        ) : null}
      </div>
      {!compact ? (
        <p className="mt-3 text-xs text-muted">
          Publishing results requires at least one published score. Final results lock score
          editing until reopened. Reopening is audited with your reason.
        </p>
      ) : null}
    </div>
  );
}
