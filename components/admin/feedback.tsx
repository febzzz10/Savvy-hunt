export function Feedback({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  if (!error && !success) return null;
  return (
    <div aria-live="polite" className="my-4">
      {error ? (
        <p
          role="alert"
          className="border-l-2 border-flame bg-flame/[0.06] px-3 py-2 text-sm text-flame"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="border-l-2 border-teal bg-teal/[0.06] px-3 py-2 text-sm text-teal">
          {success}
        </p>
      ) : null}
    </div>
  );
}
