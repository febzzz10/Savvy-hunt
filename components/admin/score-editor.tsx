"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Feedback } from "@/components/admin/feedback";
import { StatusPill } from "@/components/status-pill";
import { getErrorMessage } from "@/lib/errors";

type SchoolRow = {
  _id: string;
  name: string;
  isActive: boolean;
  score: {
    _id: string;
    points: number;
    status: string;
    note?: string | null;
    revision: number;
    updatedAt: number;
  } | null;
};

export function ScoreEditor({ eventId }: { eventId: Id<"events"> }) {
  const data = useQuery(api.admin.listScoresForEvent, { eventId });

  if (data === undefined) {
    return (
      <div className="card animate-pulse p-6">
        <div className="h-6 w-40 bg-paper-deep" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-12 border border-line bg-white/40" />
          ))}
        </div>
      </div>
    );
  }

  const licensed = data.event.resultStatus === "final" || data.event.status === "cancelled";
  const scored = data.schools.filter(
    (school: SchoolRow) => school.score?.status === "published",
  ).length;

  return (
    <section className="card p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h2 className="display text-2xl">Scores</h2>
          <p className="mt-1 text-xs text-muted">
            {scored} of {data.schools.length} schools have a published score.
          </p>
        </div>
        <p className="text-xs text-muted">
          Allowed range: {data.settings.minimumPoints}–{data.settings.maximumPoints}
          {data.settings.allowDecimalPoints ? " · decimals allowed" : " · whole numbers only"}
        </p>
      </div>

      {licensed ? (
        <div className="mt-4 border-l-2 border-gold bg-gold/[0.08] px-3 py-2 text-xs text-ink-soft">
          {data.event.status === "cancelled"
            ? "This event is cancelled. Reopen it before editing scores."
            : "Results are final. Reopen them before editing scores."}
        </div>
      ) : null}

      <div className="mt-4 divide-y divide-line">
        {data.schools.map((school: SchoolRow) => (
          <ScoreRow
            key={`${school._id}:${school.score?.revision ?? 0}`}
            eventId={eventId}
            school={school}
            locked={licensed}
            allowDecimal={data.settings.allowDecimalPoints}
            minimum={data.settings.minimumPoints}
            maximum={data.settings.maximumPoints}
          />
        ))}
      </div>
    </section>
  );
}

function ScoreRow({
  eventId,
  school,
  locked,
  allowDecimal,
  minimum,
  maximum,
}: {
  eventId: Id<"events">;
  school: SchoolRow;
  locked: boolean;
  allowDecimal: boolean;
  minimum: number;
  maximum: number;
}) {
  const setScore = useMutation(api.admin.setScore);
  const voidScore = useMutation(api.admin.voidScore);
  const [points, setPoints] = useState(school.score ? String(school.score.points) : "");
  const [status, setStatus] = useState(
    school.score?.status === "draft" ? "draft" : "published",
  );
  const [note, setNote] = useState(school.score?.note ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSuccess(null);
    if (points.trim() === "") {
      setError("Enter points first.");
      return;
    }
    const numericPoints = Number(points);
    if (!Number.isFinite(numericPoints)) {
      setError("Points must be a number.");
      return;
    }
    setPending(true);
    try {
      const result = await setScore({
        eventId,
        schoolId: school._id as never,
        points: numericPoints,
        status: status as never,
        note: note.trim(),
        expectedRevision: school.score?.revision,
      });
      setSuccess(result.changed ? "Saved." : "No changes.");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setPending(false);
    }
  }

  async function voidEntry() {
    if (!school.score) return;
    const reason = window.prompt(
      `Why are you voiding ${school.name}'s score? This reason is recorded in the audit log.`,
    );
    if (reason === null) return;
    if (!reason.trim()) {
      setError("A reason is required to void a score.");
      return;
    }
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      await voidScore({
        scoreId: school.score._id as never,
        reason,
        expectedRevision: school.score.revision,
      });
      setSuccess("Score voided.");
    } catch (voidError) {
      setError(getErrorMessage(voidError));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`py-4 ${school.isActive ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{school.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-wider text-muted">
            {school.score ? (
              <>
                <StatusPill status={school.score.status} />
                <span>rev {school.score.revision}</span>
              </>
            ) : (
              <span>No score</span>
            )}
            {!school.isActive ? <span>Archived school</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            className="input w-24 tabular-nums"
            value={points}
            onChange={(inputEvent) => setPoints(inputEvent.target.value)}
            min={minimum}
            max={maximum}
            step={allowDecimal ? "any" : "1"}
            aria-label={`${school.name} points`}
            disabled={locked}
          />
          <select
            className="select w-28"
            value={status}
            onChange={(inputEvent) => setStatus(inputEvent.target.value)}
            aria-label={`${school.name} score status`}
            disabled={locked}
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <button
            type="button"
            className="btn btn-primary min-h-9 px-3 py-1.5"
            onClick={save}
            disabled={locked || pending}
          >
            Save
          </button>
          {school.score && school.score.status !== "voided" ? (
            <button
              type="button"
              className="btn btn-danger min-h-9 px-3 py-1.5"
              onClick={voidEntry}
              disabled={locked || pending}
            >
              Void
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          className="input min-h-9 flex-1 py-1 text-xs"
          value={note}
          onChange={(inputEvent) => setNote(inputEvent.target.value)}
          placeholder="Private note (optional)"
          maxLength={500}
          aria-label={`${school.name} score note`}
          disabled={locked}
        />
        {school.score?.status === "voided" ? (
          <p className="text-xs text-muted">
            Voided scores are excluded. Saving publishes a new value.
          </p>
        ) : null}
      </div>

      <Feedback error={error} success={success} />
    </div>
  );
}
