import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { appError, optionalText, requireText, writeAudit } from "./lib/auth";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

export const bootstrapAdmin = internalMutation({
  args: {
    secret: v.string(),
    authSubject: v.string(),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expected = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!expected) {
      throw appError(
        "FORBIDDEN",
        "Admin bootstrap is disabled. Set ADMIN_BOOTSTRAP_SECRET on the Convex deployment.",
      );
    }
    if (!timingSafeEqual(args.secret, expected)) {
      throw appError("FORBIDDEN", "Invalid bootstrap secret.");
    }

    const activeAdmin = await ctx.db
      .query("admins")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();
    if (activeAdmin) {
      throw appError(
        "ALREADY_EXISTS",
        "An active admin already exists. Ask an existing admin to grant access.",
      );
    }

    const authSubject = requireText(args.authSubject, "Clerk user ID", 200);
    const email = optionalText(args.email, 200);
    const displayName = optionalText(args.displayName, 120) ?? email ?? "Admin";
    const actorSubject = "bootstrap:system";
    const now = Date.now();

    const existing = await ctx.db
      .query("admins")
      .withIndex("by_auth_subject", (q) => q.eq("authSubject", authSubject))
      .first();

    let adminId;
    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        displayName,
        isActive: true,
        updatedAt: now,
        updatedBy: actorSubject,
      });
      adminId = existing._id;
    } else {
      adminId = await ctx.db.insert("admins", {
        authSubject,
        email,
        displayName,
        role: "admin",
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: actorSubject,
        updatedBy: actorSubject,
      });
    }

    await writeAudit(ctx, {
      entityType: "admin",
      entityId: adminId,
      action: "bootstrap",
      actorSubject,
      detail: displayName,
      newStatus: "active",
    });

    return adminId;
  },
});
