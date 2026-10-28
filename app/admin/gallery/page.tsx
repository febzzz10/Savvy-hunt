"use client";

import Image from "next/image";
import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Feedback } from "@/components/admin/feedback";
import { StatusPill } from "@/components/status-pill";
import { getErrorMessage } from "@/lib/errors";
import { formatBytes, formatTimeAgo } from "@/lib/format";

type GalleryItem = {
  _id: string;
  driveName: string;
  driveFileId: string;
  mimeType: string;
  sizeBytes?: number | null;
  url: string | null;
  caption?: string | null;
  altText?: string | null;
  eventId?: string | null;
  eventName?: string | null;
  categoryName?: string | null;
  status: string;
  syncErrorCode?: string | null;
  updatedAt: number;
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "pending_review", label: "Needs review" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
] as const;

export default function AdminGalleryPage() {
  const [filter, setFilter] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const items = useQuery(api.admin.listGallery, {
    ...(filter ? { status: filter as never } : {}),
    limit: 200,
  });
  const status = useQuery(api.admin.driveStatus);
  const syncNow = useAction(api.drive.syncNow);

  async function sync() {
    setError(null);
    setMessage(null);
    setSyncing(true);
    try {
      const result = await syncNow();
      setMessage(
        result && typeof result === "object" && "filesSeen" in result
          ? `Sync finished: ${(result as { filesSeen: number }).filesSeen} files seen.`
          : "Sync finished.",
      );
    } catch (syncError) {
      setError(getErrorMessage(syncError));
    } finally {
      setSyncing(false);
    }
  }

  const credentialsReady = status?.configured && status?.folderConfigured;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-flame">Photographs</p>
          <h1 className="display mt-3 text-4xl md:text-5xl">Gallery</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            Drive imports follow your review setting. Nothing appears publicly until it is published.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={sync}
          disabled={syncing || !credentialsReady}
        >
          {syncing ? "Syncing…" : "Sync Drive now"}
        </button>
      </header>

      <Feedback error={error} success={message} />

      <section className="card mt-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`border px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${
                  filter === item.value
                    ? "border-ink bg-ink text-paper"
                    : "border-line text-muted hover:border-ink"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted">
            {status ? (
              status.lastSync ? (
                <span>
                  Last sync {formatTimeAgo(status.lastSync.finishedAt ?? status.lastSync.startedAt)} ·{" "}
                  <StatusPill
                    status={status.lastSync.status === "success" ? "published" : status.lastSync.status}
                  />
                </span>
              ) : (
                "No sync has run yet."
              )
            ) : null}
          </div>
        </div>

        {!status ? null : !credentialsReady ? (
          <div className="mt-4 border-l-2 border-gold bg-gold/[0.08] px-3 py-2 text-xs">
            Drive is not fully configured. Missing:{" "}
            {[...(status.missing ?? []), ...(status.folderConfigured ? [] : ["folder ID"])].join(", ")}.
            Add credentials in the deployment environment or set the folder ID in settings.
          </div>
        ) : null}
      </section>

      {items === undefined ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse border border-line bg-white/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="display text-2xl">Nothing here yet.</p>
          <p className="mt-2 text-sm text-muted">
            {filter ? "No images match this filter." : "Run a sync to import images from Drive."}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item: GalleryItem) => (
            <GalleryCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const update = useMutation(api.admin.updateGalleryItem);
  const setStatus = useMutation(api.admin.setGalleryItemStatus);
  const [caption, setCaption] = useState(item.caption ?? "");
  const [altText, setAltText] = useState(item.altText ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      await update({
        galleryItemId: item._id as never,
        caption: caption.trim(),
        altText: altText.trim(),
      });
      setSuccess("Saved.");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setPending(false);
    }
  }

  async function changeStatus(next: "published" | "hidden" | "pending_review") {
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      await setStatus({ galleryItemId: item._id as never, status: next });
      setSuccess(next === "published" ? "Published." : next === "hidden" ? "Hidden." : "Moved to review.");
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="card overflow-hidden">
      <div className="relative aspect-[4/3] bg-paper-deep">
        {item.url ? (
          <Image
            src={item.url}
            alt={item.altText || item.driveName}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted">
            {item.syncErrorCode ? `Download failed: ${item.syncErrorCode}` : "No stored image"}
          </div>
        )}
        <div className="absolute left-2 top-2">
          <StatusPill status={item.status} />
        </div>
      </div>

      <div className="p-4">
        <p className="truncate text-sm font-semibold" title={item.driveName}>
          {item.driveName}
        </p>
        <p className="mt-1 text-xs text-muted">
          {[item.categoryName, item.eventName].filter(Boolean).join(" · ") || "Unassigned"}
          {item.sizeBytes ? ` · ${formatBytes(item.sizeBytes)}` : ""}
        </p>

        <div className="mt-3 space-y-2">
          <input
            className="input min-h-9 py-1 text-xs"
            value={caption}
            onChange={(inputEvent) => setCaption(inputEvent.target.value)}
            placeholder="Caption (optional)"
            maxLength={300}
            aria-label={`Caption for ${item.driveName}`}
          />
          <input
            className="input min-h-9 py-1 text-xs"
            value={altText}
            onChange={(inputEvent) => setAltText(inputEvent.target.value)}
            placeholder="Alt text (describe the photo)"
            maxLength={300}
            aria-label={`Alt text for ${item.driveName}`}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost min-h-8 px-2 py-1 text-[0.62rem]" onClick={save} disabled={pending}>
            Save text
          </button>
          {item.status !== "published" ? (
            <button
              type="button"
              className="btn btn-primary min-h-8 px-2 py-1 text-[0.62rem]"
              onClick={() => changeStatus("published")}
              disabled={pending || !item.url}
            >
              Publish
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost min-h-8 px-2 py-1 text-[0.62rem]"
              onClick={() => changeStatus("hidden")}
              disabled={pending}
            >
              Hide
            </button>
          )}
          {item.status === "hidden" ? (
            <button
              type="button"
              className="btn btn-ghost min-h-8 px-2 py-1 text-[0.62rem]"
              onClick={() => changeStatus("pending_review")}
              disabled={pending}
            >
              Send to review
            </button>
          ) : null}
        </div>

        <Feedback error={error} success={success} />
      </div>
    </article>
  );
}
