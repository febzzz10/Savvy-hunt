"use client";

import Link from "next/link";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { EmptyState } from "@/components/empty-state";
import { SmartImage } from "@/components/smart-image";

type GalleryItem = {
  _id: string;
  url: string | null;
  caption: string | null;
  altText: string;
  categoryName: string | null;
  publishedAt: number | null;
};

const ASPECTS = ["aspect-[4/5]", "aspect-[4/3]", "aspect-square"];

export default function GalleryPage() {
  const [categoryId, setCategoryId] = useState<Id<"categories"> | null>(null);
  const [active, setActive] = useState<GalleryItem | null>(null);
  const categories = useQuery(api.public.getCategories);
  const { results, status, loadMore } = usePaginatedQuery(
    api.public.getGalleryPage,
    { categoryId: categoryId ?? undefined },
    { initialNumItems: 12 },
  );

  useEffect(() => {
    if (!active) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active]);

  return (
    <div className="shell pb-20 pt-12 md:pt-16">
      <header className="grid gap-8 border-b border-line pb-10 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
        <div>
          <p className="eyebrow text-flame">The gallery</p>
          <h1 className="display mt-4 text-[clamp(3rem,7vw,5.6rem)]">
            Moments <span className="italic text-flame">off the clock.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted md:text-base">
            Photographs reach this page only after organizer review. New additions arrive
            automatically from the shared Drive folder.
          </p>
        </div>
        <p className="text-xs leading-6 text-muted">
          Hover or tap a frame to view it larger. Images that are pending review stay private.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCategoryId(null)}
          className={`border px-3.5 py-2 text-[0.68rem] font-bold uppercase tracking-[0.13em] transition-colors ${
            categoryId === null
              ? "border-ink bg-ink text-paper"
              : "border-line text-muted hover:border-ink hover:text-ink"
          }`}
        >
          All photos
        </button>
        {(categories ?? []).map((category: { _id: Id<"categories">; name: string }) => (
          <button
            key={category._id}
            type="button"
            onClick={() => setCategoryId(category._id)}
            className={`border px-3.5 py-2 text-[0.68rem] font-bold uppercase tracking-[0.13em] transition-colors ${
              categoryId === category._id
                ? "border-ink bg-ink text-paper"
                : "border-line text-muted hover:border-ink hover:text-ink"
            }`}
          >
            {category.name}
          </button>
        ))}
        <Link
          href="/schedule"
          className="ml-auto text-xs font-bold uppercase tracking-[0.13em] text-teal hover:underline"
        >
          Event schedule →
        </Link>
      </div>

      {status === "LoadingFirstPage" ? (
        <div className="mt-8 grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className={`border border-line bg-white/40 ${ASPECTS[index % ASPECTS.length]}`}
            />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No photographs here yet."
            copy="Approved images from the shared Drive folder will appear after the next organizer review."
            action={
              <Link href="/schedule" className="btn btn-ghost">
                See what is happening
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
            {results.map((item: GalleryItem, index: number) => (
              <button
                key={item._id}
                type="button"
                onClick={() => setActive(item)}
                className="group mb-4 block w-full break-inside-avoid text-left"
                aria-label={`View larger: ${item.altText}`}
              >
                <span
                  className={`relative block w-full overflow-hidden bg-paper-deep ${ASPECTS[index % ASPECTS.length]}`}
                >
                  <SmartImage
                    src={item.url}
                    alt={item.altText}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                  />
                  <span className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-ink/80 to-transparent px-4 pb-3 pt-10 text-xs font-semibold text-paper opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    {item.caption ?? item.categoryName ?? "Savvy Hunt"}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 border-t border-line pt-6">
            {status === "CanLoadMore" ? (
              <button type="button" className="btn btn-ghost" onClick={() => loadMore(12)}>
                Load more photographs
              </button>
            ) : status === "LoadingMore" ? (
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Loading more…</p>
            ) : (
              <p className="text-xs uppercase tracking-[0.14em] text-muted">End of the gallery</p>
            )}
          </div>
        </>
      )}

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.altText}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/92 p-4 md:p-8"
          onClick={() => setActive(null)}
        >
          <div
            className="relative flex h-[82vh] w-full max-w-6xl flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative min-h-0 flex-1">
              <SmartImage
                src={active.url}
                alt={active.altText}
                sizes="100vw"
                className="object-contain"
              />
            </div>
            <div className="mt-4 flex items-start justify-between gap-6 text-paper">
              <div>
                <p className="text-sm font-medium">{active.caption ?? active.categoryName ?? "Savvy Hunt"}</p>
                {active.categoryName ? (
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-paper/60">
                    {active.categoryName}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                autoFocus
                className="border border-paper/30 px-3 py-2 text-xs font-bold uppercase tracking-[0.13em] text-paper hover:bg-paper/10"
                onClick={() => setActive(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
