import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import { appError, findAdminBySubject } from "./lib/auth";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const admin = await findAdminBySubject(ctx, identity.subject);
    if (!admin) return null;
    return {
      displayName: admin.displayName ?? admin.email ?? identity.email ?? "Admin",
      email: admin.email ?? identity.email ?? null,
      role: admin.role,
    };
  },
});

export const adminBySubject = internalQuery({
  args: { authSubject: v.string() },
  handler: async (ctx, args) => {
    const admin = await findAdminBySubject(ctx, args.authSubject);
    if (!admin) {
      throw appError("FORBIDDEN", "This account is not an active Savvy Hunt admin.");
    }
    return {
      adminId: admin._id,
      displayName: admin.displayName ?? admin.email ?? "Admin",
    };
  },
});
