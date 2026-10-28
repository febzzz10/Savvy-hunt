"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignIn, SignOutButton, UserButton, useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CLERK_ENABLED } from "@/lib/env";

const NAV = [
  { href: "/admin", label: "Dashboard", index: "01" },
  { href: "/admin/events", label: "Events", index: "02" },
  { href: "/admin/scores", label: "Scores", index: "03" },
  { href: "/admin/results", label: "Results", index: "04" },
  { href: "/admin/gallery", label: "Gallery", index: "05" },
  { href: "/admin/catalog", label: "Catalog", index: "06" },
  { href: "/admin/audit", label: "Audit log", index: "07" },
  { href: "/admin/settings", label: "Settings", index: "08" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;
  if (!CLERK_ENABLED) return <SetupNotice />;
  return <ClerkGate>{children}</ClerkGate>;
}

function SetupNotice() {
  return (
    <AuthShell>
      <p className="eyebrow text-flame">Admin access not configured</p>
      <h1 className="display mt-4 text-4xl md:text-5xl">Clerk is not connected.</h1>
      <p className="mt-4 max-w-lg text-sm leading-7 text-muted">
        The public site can run without authentication, but the admin area cannot. Add these
        values to <code className="bg-paper-deep px-1.5 py-0.5">.env.local</code>:
      </p>
      <pre className="mt-5 overflow-x-auto border border-line bg-white/60 p-4 text-xs leading-6">
{`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud`}
      </pre>
      <p className="mt-4 max-w-lg text-sm leading-7 text-muted">
        Then set <code className="bg-paper-deep px-1.5 py-0.5">CLERK_JWT_ISSUER_DOMAIN</code> on
        the Convex deployment and name the Clerk JWT template{" "}
        <code className="bg-paper-deep px-1.5 py-0.5">convex</code>. No admin backdoor is
        available in this build.
      </p>
      <Link href="/" className="btn btn-ghost mt-6">
        Back to public site
      </Link>
    </AuthShell>
  );
}

function ClerkGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="eyebrow text-muted">Checking session…</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <AuthShell wide>
        <p className="eyebrow text-flame">Organizer access</p>
        <h1 className="display mt-3 text-4xl">Sign in to run the hunt.</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          Only active Savvy Hunt admins can publish events, scores, and photographs.
        </p>
        <div className="mt-8 flex justify-center">
          <SignIn routing="hash" />
        </div>
        <Link href="/" className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.13em] text-teal hover:underline">
          ← Back to public site
        </Link>
      </AuthShell>
    );
  }

  return <AdminSession>{children}</AdminSession>;
}

function AdminSession({ children }: { children: React.ReactNode }) {
  const me = useQuery(api.auth.me);
  const pathname = usePathname();

  if (me === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="eyebrow text-muted">Verifying admin access…</p>
      </div>
    );
  }

  if (me === null) {
    return (
      <AuthShell>
        <p className="eyebrow text-flame">Access denied</p>
        <h1 className="display mt-4 text-4xl">This account is signed in, but not an admin.</h1>
        <p className="mt-4 max-w-lg text-sm leading-7 text-muted">
          Ask an existing admin to grant access, or bootstrap the first admin from the Convex
          CLI with the deployment&apos;s <code className="bg-paper-deep px-1.5 py-0.5">ADMIN_BOOTSTRAP_SECRET</code>.
        </p>
        <div className="mt-6 flex items-center gap-4">
          <SignOutButton>
            <button type="button" className="btn btn-ghost">
              Sign out
            </button>
          </SignOutButton>
          <UserButton />
        </div>
      </AuthShell>
    );
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15.5rem_1fr]">
      <aside className="hidden min-h-screen flex-col border-r border-line bg-paper-deep/45 md:flex">
        <div className="border-b border-line px-6 py-6">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="display grid h-9 w-9 place-items-center bg-ink text-lg text-paper">
              S
            </span>
            <span>
              <span className="display block text-lg leading-none">Savvy Hunt</span>
              <span className="mt-1 block text-[0.55rem] font-bold uppercase tracking-[0.18em] text-muted">
                Organizer desk
              </span>
            </span>
          </Link>
        </div>
        <nav className="flex-1 py-4" aria-label="Admin">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="admin-link"
              data-active={
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href)
              }
            >
              <span className="text-[0.6rem] tabular-nums text-line">{item.index}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line px-6 py-5">
          <div className="flex items-center gap-3">
            <UserButton />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{me.displayName}</p>
              <p className="truncate text-[0.65rem] uppercase tracking-wider text-muted">
                Admin
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 text-xs">
            <Link href="/" className="text-muted hover:text-ink">
              View public site →
            </Link>
            <SignOutButton>
              <button type="button" className="text-left text-muted hover:text-flame">
                Sign out
              </button>
            </SignOutButton>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/92 backdrop-blur md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="display grid h-8 w-8 place-items-center bg-ink text-paper">S</span>
              <span className="display text-lg">Organizer desk</span>
            </Link>
            <div className="flex items-center gap-3">
              <UserButton />
              <SignOutButton>
                <button type="button" className="text-xs font-bold uppercase tracking-wider text-muted">
                  Out
                </button>
              </SignOutButton>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Admin mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap border px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${
                  (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href))
                    ? "border-ink bg-ink text-paper"
                    : "border-line text-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="px-4 py-8 md:px-8 lg:px-12 lg:py-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function AuthShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className={`card w-full p-7 md:p-10 ${wide ? "max-w-2xl" : "max-w-xl"}`}>
        {children}
      </div>
    </div>
  );
}
