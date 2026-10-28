import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-paper-deep/40">
      <div className="shell grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="display text-3xl">Savvy Hunt</p>
          <p className="mt-3 max-w-sm text-sm leading-7 text-muted">
            The annual inter-school championship. Live scores, verified results, and the
            photographs worth keeping.
          </p>
        </div>
        <div>
          <p className="eyebrow text-muted">Follow the hunt</p>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <Link href="/scoreboard" className="hover:text-flame">
              Scoreboard
            </Link>
            <Link href="/schedule" className="hover:text-flame">
              Schedule
            </Link>
            <Link href="/gallery" className="hover:text-flame">
              Gallery
            </Link>
          </div>
        </div>
        <div>
          <p className="eyebrow text-muted">Organizers</p>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <Link href="/admin" className="hover:text-flame">
              Admin sign in
            </Link>
            <span className="text-muted">Times shown in the event timezone.</span>
          </div>
        </div>
      </div>
      <div className="shell flex flex-col gap-2 border-t border-line py-5 text-[0.7rem] uppercase tracking-[0.12em] text-muted md:flex-row md:items-center md:justify-between">
        <span>© {new Date().getFullYear()} Savvy Hunt</span>
        <span>Built for the schools, not the spreadsheet.</span>
      </div>
    </footer>
  );
}
