"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/scoreboard", label: "Scoreboard" },
  { href: "/schedule", label: "Schedule" },
  { href: "/gallery", label: "Gallery" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="shell flex h-[4.5rem] items-center justify-between gap-6">
        <Link href="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="display grid h-10 w-10 place-items-center bg-ink text-xl text-paper transition-colors group-hover:bg-flame">
            S
          </span>
          <span className="flex flex-col leading-none">
            <span className="display text-xl tracking-tight">Savvy Hunt</span>
            <span className="mt-1 text-[0.58rem] font-bold uppercase tracking-[0.2em] text-muted">
              Inter-school championship
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-[0.72rem] font-bold uppercase tracking-[0.15em] transition-colors ${
                  active ? "text-flame" : "text-ink-soft hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/admin" className="btn btn-ghost ml-3 min-h-9 px-3 py-1.5 text-[0.68rem]">
            Admin
          </Link>
        </nav>

        <button
          type="button"
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 border border-line md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span
            className={`h-px w-5 bg-ink transition-transform ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
          />
          <span
            className={`h-px w-5 bg-ink transition-transform ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
          />
        </button>
      </div>

      {open ? (
        <nav id="mobile-nav" className="border-t border-line bg-paper md:hidden" aria-label="Mobile">
          <div className="shell flex flex-col py-3">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-line/70 py-3 text-sm font-semibold uppercase tracking-[0.12em]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="py-3 text-sm font-semibold uppercase tracking-[0.12em] text-flame"
            >
              Admin
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
