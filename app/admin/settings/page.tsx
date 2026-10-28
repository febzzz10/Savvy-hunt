"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Feedback } from "@/components/admin/feedback";
import { StatusPill } from "@/components/status-pill";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";

type Settings = {
  updatedAt: number;
  eventTimezone: string;
  minimumPoints: number;
  maximumPoints: number;
  allowDecimalPoints: boolean;
  showZeroScoreSchools: boolean;
  provisionalResultsPublic: boolean;
  galleryRequiresReview: boolean;
  maxGalleryFileBytes: number;
  driveFolderId: string;
};

export default function AdminSettingsPage() {
  const settings = useQuery(api.admin.getAdminSettings);
  const status = useQuery(api.admin.driveStatus);
  const admins = useQuery(api.admin.listAdmins);

  if (settings === undefined || status === undefined || admins === undefined) {
    return <div className="h-72 animate-pulse border border-line bg-white/40" />;
  }

  return (
    <div>
      <header>
        <p className="eyebrow text-flame">Configuration</p>
        <h1 className="display mt-3 text-4xl md:text-5xl">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
          These defaults apply to every event and the public gallery.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <SettingsForm key={settings.updatedAt} settings={settings} />

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="display text-2xl">Google Drive</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusPill status={status.configured ? "active" : "inactive"} />
              <span className="text-xs text-muted">
                {status.configured ? "Credentials present" : "Credentials missing"}
              </span>
            </div>
            {status.missing.length > 0 ? (
              <p className="mt-3 text-xs text-flame">Missing: {status.missing.join(", ")}</p>
            ) : null}
            <p className="mt-3 text-xs leading-6 text-muted">
              Folder: {status.folderConfigured ? "configured" : "not configured"}. Add OAuth
              secrets to the Convex deployment, then use Sync in the gallery.
            </p>
            {status.lastSync ? (
              <p className="mt-3 text-xs text-muted">
                Last run {formatDateTime(status.lastSync.startedAt, settings.eventTimezone)} ·{" "}
                {status.lastSync.filesSeen} seen, {status.lastSync.filesFailed} failed.
              </p>
            ) : null}
          </section>

          <section className="card p-5">
            <h2 className="display text-2xl">Admins</h2>
            <ul className="mt-3 divide-y divide-line">
              {admins.map((admin: {
                _id: string;
                displayName: string | null;
                email: string | null;
                isActive: boolean;
              }) => (
                <li key={admin._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {admin.displayName || admin.email || "Unnamed admin"}
                    </span>
                    {admin.displayName && admin.email ? (
                      <span className="block truncate text-xs text-muted">{admin.email}</span>
                    ) : null}
                  </span>
                  <StatusPill status={admin.isActive ? "active" : "inactive"} />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-6 text-muted">
              Add the first admin through the Convex CLI bootstrap mutation. Additional admins are
              managed directly in the <code>admins</code> table.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function SettingsForm({ settings }: { settings: Settings }) {
  const update = useMutation(api.admin.updateSettings);
  const [timezone, setTimezone] = useState(settings.eventTimezone);
  const [minimum, setMinimum] = useState(String(settings.minimumPoints));
  const [maximum, setMaximum] = useState(String(settings.maximumPoints));
  const [allowDecimal, setAllowDecimal] = useState(settings.allowDecimalPoints);
  const [showZero, setShowZero] = useState(settings.showZeroScoreSchools);
  const [provisionalPublic, setProvisionalPublic] = useState(settings.provisionalResultsPublic);
  const [requiresReview, setRequiresReview] = useState(settings.galleryRequiresReview);
  const [maxGalleryMb, setMaxGalleryMb] = useState(
    String(Math.round(settings.maxGalleryFileBytes / (1024 * 1024))),
  );
  const [driveFolderId, setDriveFolderId] = useState(settings.driveFolderId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function save(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    setSuccess(null);
    const minimumPoints = Number(minimum);
    const maximumPoints = Number(maximum);
    const galleryMb = Number(maxGalleryMb);
    if (!Number.isFinite(minimumPoints) || !Number.isFinite(maximumPoints)) {
      setError("Point limits must be numbers.");
      return;
    }
    if (!Number.isFinite(galleryMb) || galleryMb < 1 || galleryMb > 100) {
      setError("Gallery file limit must be between 1 and 100 MB.");
      return;
    }
    setPending(true);
    try {
      await update({
        eventTimezone: timezone,
        minimumPoints,
        maximumPoints,
        allowDecimalPoints: allowDecimal,
        showZeroScoreSchools: showZero,
        provisionalResultsPublic: provisionalPublic,
        galleryRequiresReview: requiresReview,
        maxGalleryFileBytes: Math.round(galleryMb * 1024 * 1024),
        driveFolderId: driveFolderId.trim(),
      });
      setSuccess("Settings saved.");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="card p-5 md:p-6">
      <h2 className="display text-2xl">Scoring & display</h2>
      <Feedback error={error} success={success} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="settings-timezone" className="label">
            Event timezone
          </label>
          <input
            id="settings-timezone"
            className="input"
            value={timezone}
            onChange={(inputEvent) => setTimezone(inputEvent.target.value)}
            placeholder="Asia/Kolkata"
            required
          />
          <p className="mt-1 text-xs text-muted">IANA name, e.g. Asia/Kolkata.</p>
        </div>
        <div>
          <label htmlFor="settings-review" className="label">
            Gallery review
          </label>
          <select
            id="settings-review"
            className="select"
            value={requiresReview ? "yes" : "no"}
            onChange={(inputEvent) => setRequiresReview(inputEvent.target.value === "yes")}
          >
            <option value="yes">Require approval before publishing</option>
            <option value="no">New images stay hidden until published</option>
          </select>
        </div>
        <div>
          <label htmlFor="settings-minimum" className="label">
            Minimum points
          </label>
          <input
            id="settings-minimum"
            type="number"
            className="input"
            value={minimum}
            onChange={(inputEvent) => setMinimum(inputEvent.target.value)}
          />
        </div>
        <div>
          <label htmlFor="settings-maximum" className="label">
            Maximum points
          </label>
          <input
            id="settings-maximum"
            type="number"
            className="input"
            value={maximum}
            onChange={(inputEvent) => setMaximum(inputEvent.target.value)}
          />
        </div>
        <div>
          <label htmlFor="settings-gallery-size" className="label">
            Max image size (MB)
          </label>
          <input
            id="settings-gallery-size"
            type="number"
            className="input"
            value={maxGalleryMb}
            onChange={(inputEvent) => setMaxGalleryMb(inputEvent.target.value)}
            min={1}
            max={100}
          />
        </div>
        <div>
          <label htmlFor="settings-drive-folder" className="label">
            Drive folder ID
          </label>
          <input
            id="settings-drive-folder"
            className="input"
            value={driveFolderId}
            onChange={(inputEvent) => setDriveFolderId(inputEvent.target.value)}
            placeholder="From the folder URL"
          />
        </div>
      </div>

      <div className="mt-5 space-y-3 border-t border-line pt-4">
        <Check
          id="allow-decimal"
          label="Allow decimal points"
          checked={allowDecimal}
          onChange={setAllowDecimal}
        />
        <Check
          id="show-zero"
          label="Show schools with zero points on public scoreboards"
          checked={showZero}
          onChange={setShowZero}
        />
        <Check
          id="provisional-public"
          label="Provisional results are publicly visible"
          checked={provisionalPublic}
          onChange={setProvisionalPublic}
        />
      </div>

      <button type="submit" className="btn btn-primary mt-6" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

function Check({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-ink"
        checked={checked}
        onChange={(inputEvent) => onChange(inputEvent.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
