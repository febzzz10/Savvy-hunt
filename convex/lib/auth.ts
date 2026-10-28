import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

export type AuthErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "STALE_UPDATE"
  | "INVALID_STATE_TRANSITION"
  | "ALREADY_RUNNING"
  | "DRIVE_NOT_CONFIGURED"
  | "DRIVE_SYNC_FAILED";

export type AppErrorData = { code: AuthErrorCode; message: string };

export function appError(code: AuthErrorCode, message: string): ConvexError<AppErrorData> {
  return new ConvexError({ code, message });
}

export type AdminContext = {
  admin: Doc<"admins">;
  actorSubject: string;
  displayName: string;
};

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<AdminContext> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw appError("UNAUTHENTICATED", "Sign in with an authorized admin account to continue.");
  }
  const admin = await findAdminBySubject(ctx, identity.subject);
  if (!admin) {
    throw appError("FORBIDDEN", "This account is not an active Savvy Hunt admin.");
  }
  return {
    admin,
    actorSubject: identity.subject,
    displayName: admin.displayName ?? admin.email ?? identity.email ?? "Admin",
  };
}

export async function findAdminBySubject(
  ctx: QueryCtx | MutationCtx,
  authSubject: string,
): Promise<Doc<"admins"> | null> {
  const admin = await ctx.db
    .query("admins")
    .withIndex("by_auth_subject", (q) => q.eq("authSubject", authSubject))
    .first();
  if (!admin || !admin.isActive) return null;
  return admin;
}

export async function writeAudit(
  ctx: MutationCtx,
  entry: {
    entityType:
      | "school"
      | "category"
      | "event"
      | "score"
      | "galleryItem"
      | "admin"
      | "settings";
    entityId: string;
    action: string;
    actorSubject: string;
    reason?: string;
    oldPoints?: number;
    newPoints?: number;
    oldStatus?: string;
    newStatus?: string;
    detail?: string;
    createdAt?: number;
  },
): Promise<void> {
  await ctx.db.insert("auditLogs", {
    ...entry,
    createdAt: entry.createdAt ?? Date.now(),
  });
}

export function requireText(value: string, field: string, max = 200): string {
  const trimmed = value.trim();
  if (!trimmed) throw appError("VALIDATION_ERROR", `${field} is required.`);
  if (trimmed.length > max) {
    throw appError("VALIDATION_ERROR", `${field} must be ${max} characters or fewer.`);
  }
  return trimmed;
}

export function optionalText(value: string | undefined, max = 2000): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > max) {
    throw appError("VALIDATION_ERROR", `Text must be ${max} characters or fewer.`);
  }
  return trimmed;
}
