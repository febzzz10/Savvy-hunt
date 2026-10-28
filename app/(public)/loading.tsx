export default function PublicLoading() {
  return (
    <div className="shell animate-pulse pb-20 pt-16">
      <div className="h-3 w-40 bg-paper-deep" />
      <div className="mt-6 h-16 w-3/4 max-w-3xl bg-paper-deep" />
      <div className="mt-4 h-16 w-1/2 max-w-xl bg-paper-deep" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-48 border border-line bg-white/40" />
        ))}
      </div>
    </div>
  );
}
