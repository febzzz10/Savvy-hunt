"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatusPill } from "@/components/status-pill";
import { formatDateTime } from "@/lib/format";

const ENTITY_FILTERS = [
  { value: "", label: "Everything" },
  { value: "event", label: "Events" },
  { value: "score", label: "Scores" },
  { value: "school", label: "Schools" },
  { value: "category", label: "Categories" },
  { value: "galleryItem", label: "Gallery" },
  { value: "settings", label: "Settings" },
] as const;

type Log = {
  _id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string | null;
  detail?: string | null;
  oldStatus?: string | null;
  newStatus?: string | null;
  oldPoints?: number | null;
  newPoints?: number | null;
  createdAt: number;
};

export default function AdminAuditPage() {
  const [entityType, setEntityType] = useState("");
  const logs = useQuery(api.admin.listAuditLogs, {
    limit: 150,
    ...(entityType ? { entityType: entityType as never } : {}),
  });
  const settings = useQuery(api.admin.getAdminSettings);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-flame">Accountability</p>
          <h1 className="display mt-3 text-4xl md:text-5xl">Audit log</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            Every publish, reopen, void, and archive is recorded here with the admin and reason.
          </p>
        </div>
        <select
          className="select w-48"
          value={entityType}
          onChange={(inputEvent) => setEntityType(inputEvent.target.value)}
          aria-label="Filter audit logs"
        >
          {ENTITY_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </header>

      {logs === undefined || settings === undefined ? (
        <div className="mt-8 h-64 animate-pulse border border-line bg-white/40" />
      ) : logs.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="display text-2xl">Nothing recorded yet.</p>
          <p className="mt-2 text-sm text-muted">Admin actions will appear here.</p>
        </div>
      ) : (
        <div className="card mt-8 overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Entity</th>
                <th className="px-4 py-3 font-semibold">Change</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.map((log: Log) => (
                <tr key={log._id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                    {formatDateTime(log.createdAt, settings.eventTimezone)}
                  </td>
                  <td className="px-4 py-3">{log.actorName}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {log.action.replaceAll("_", " ")}
                    </span>
                    {log.detail ? (
                      <span className="mt-1 block text-xs text-muted">{log.detail}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wider text-muted">
                    {log.entityType}
                  </td>
                  <td className="px-4 py-3">
                    {log.oldStatus || log.newStatus ? (
                      <span className="flex flex-wrap items-center gap-1 text-xs">
                        {log.oldStatus ? <StatusPill status={log.oldStatus} /> : null}
                        {log.oldStatus && log.newStatus ? <span aria-hidden="true">→</span> : null}
                        {log.newStatus ? <StatusPill status={log.newStatus} /> : null}
                      </span>
                    ) : null}
                    {log.oldPoints !== undefined && log.oldPoints !== null ? (
                      <span className="mt-1 block text-xs tabular-nums text-muted">
                        {log.oldPoints} → {log.newPoints ?? "void"}
                      </span>
                    ) : log.newPoints !== undefined && log.newPoints !== null ? (
                      <span className="mt-1 block text-xs tabular-nums text-muted">
                        New: {log.newPoints}
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-xs text-muted">{log.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
