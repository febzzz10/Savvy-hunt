export function EmptyState({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-line px-6 py-14 text-center">
      <p className="display text-2xl md:text-3xl">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted">{copy}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
