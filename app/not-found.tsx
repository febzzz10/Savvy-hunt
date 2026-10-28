import Link from "next/link";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="shell flex flex-1 items-center justify-center py-20">
        <div className="max-w-xl text-center">
          <p className="display text-8xl text-flame">404</p>
          <h1 className="display mt-4 text-4xl md:text-5xl">Off the scoreboard.</h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            This page does not exist, or the event has been moved. Follow the board to find
            what is still live.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn btn-primary">
              Go home
            </Link>
            <Link href="/scoreboard" className="btn btn-ghost">
              Open scoreboard
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
