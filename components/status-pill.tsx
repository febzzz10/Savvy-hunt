const LABELS: Record<string, string> = {
  upcoming: "Upcoming",
  live: "Live",
  paused: "Paused",
  postponed: "Postponed",
  completed: "Completed",
  cancelled: "Cancelled",
  draft: "Draft",
  published: "Published",
  archived: "Archived",
  not_ready: "Results pending",
  provisional: "Provisional",
  final: "Final",
  pending_review: "Needs review",
  hidden: "Hidden",
  unavailable: "Unavailable",
  sync_error: "Sync error",
  voided: "Voided",
  active: "Active",
  inactive: "Inactive",
};

const TONES: Record<string, string> = {
  live: "bg-flame text-white border-flame",
  final: "bg-teal text-white border-teal",
  provisional: "bg-transparent text-gold border-gold",
  completed: "bg-ink text-paper border-ink",
  paused: "bg-gold text-ink border-gold",
  postponed: "bg-transparent text-gold border-gold",
  cancelled: "bg-transparent text-muted border-line line-through",
  draft: "bg-paper-deep text-muted border-line",
  pending_review: "bg-gold/15 text-gold border-gold/50",
  hidden: "bg-transparent text-muted border-line",
  unavailable: "bg-transparent text-muted border-line",
  sync_error: "bg-flame/10 text-flame border-flame/40",
  voided: "bg-transparent text-muted border-line line-through",
  inactive: "bg-paper-deep text-muted border-line",
};

export function StatusPill({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const known = LABELS[status] ?? status.replaceAll("_", " ");
  const tone = TONES[status] ?? "bg-paper-deep text-ink border-line";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.13em] ${tone} ${className}`}
    >
      {status === "live" ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
      ) : null}
      {known}
    </span>
  );
}
