"use client";

import Link from "next/link";
import { SignIn, useAuth } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/env";

export default function AdminLoginPage() {
  if (!CLERK_ENABLED) {
    return <LoginNotice />;
  }
  return <ClerkLogin />;
}

function LoginNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="card w-full max-w-xl p-8">
        <p className="eyebrow text-flame">Admin login unavailable</p>
        <h1 className="display mt-4 text-4xl">Clerk is not configured.</h1>
        <p className="mt-4 text-sm leading-7 text-muted">
          Set <code className="bg-paper-deep px-1.5 py-0.5">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>{" "}
          and <code className="bg-paper-deep px-1.5 py-0.5">CLERK_SECRET_KEY</code>, then restart
          the dev server.
        </p>
        <Link href="/" className="btn btn-ghost mt-6">
          Back to public site
        </Link>
      </div>
    </div>
  );
}

function ClerkLogin() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <div className="mb-6 flex items-center gap-3">
        <span className="display grid h-10 w-10 place-items-center bg-ink text-xl text-paper">S</span>
        <span className="display text-2xl">Organizer desk</span>
      </div>
      {!isLoaded ? (
        <p className="eyebrow text-muted">Checking session…</p>
      ) : isSignedIn ? (
        <div className="card w-full max-w-md p-8 text-center">
          <p className="display text-3xl">Already signed in.</p>
          <Link href="/admin" className="btn btn-primary mt-6">
            Open dashboard
          </Link>
        </div>
      ) : (
        <SignIn routing="hash" />
      )}
      <Link href="/" className="mt-8 text-xs font-bold uppercase tracking-[0.13em] text-teal hover:underline">
        ← Back to public site
      </Link>
    </div>
  );
}
