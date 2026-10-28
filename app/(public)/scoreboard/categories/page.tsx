"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { EmptyState } from "@/components/empty-state";

export default function CategoriesPage() {
  const categories = useQuery(api.public.getCategories);

  return (
    <div className="shell pb-20 pt-12 md:pt-16">
      <header className="border-b border-line pb-10">
        <p className="eyebrow text-flame">Results by discipline</p>
        <h1 className="display mt-4 max-w-4xl text-[clamp(2.8rem,7vw,5.6rem)]">
          Every category, <span className="italic text-flame">every result.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-muted md:text-base">
          Open a category to see each event, its status, and the school ranking once results
          are published.
        </p>
      </header>

      {categories === undefined ? (
        <div className="mt-10 grid animate-pulse gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 border border-line bg-white/40" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No public categories yet."
            copy="Categories appear here when organizers publish them."
            action={
              <Link href="/schedule" className="btn btn-ghost">
                View schedule
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {categories.map(
            (category: { _id: string; slug: string; name: string; description: string | null }, index: number) => (
              <Link
                key={category._id}
                href={`/scoreboard/categories/${category.slug}`}
                className="group card flex flex-col justify-between p-6 transition-colors hover:border-ink md:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="display text-3xl text-line transition-colors group-hover:text-flame">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-teal opacity-0 transition-opacity group-hover:opacity-100">
                    Open →
                  </span>
                </div>
                <div className="mt-8">
                  <h2 className="display text-4xl">{category.name}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    {category.description ?? "Event results and school rankings for this category."}
                  </p>
                </div>
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
