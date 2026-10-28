"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="shell flex min-h-[60vh] items-center justify-center py-20">
      <div className="max-w-xl text-center">
        <p className="eyebrow text-flame">Connection interrupted</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">The board did not load.</h1>
        <p className="mt-4 text-sm leading-7 text-muted">
          The live connection to the scoreboard failed. Check your network and try again — no
          results have been lost.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn-ghost">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
