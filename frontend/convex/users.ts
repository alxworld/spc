import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/** Returns the full user record for the currently authenticated user. */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email))
      .unique();
  },
});

/** Returns all users — admin only (role check done in calling code for now). */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const me = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email))
      .unique();
    if (!me || (me.role !== "admin" && me.role !== "superadmin")) {
      throw new Error("Admin access required");
    }
    return await ctx.db.query("users").take(200);
  },
});

/** Seed superadmin — only runs if no superadmin exists yet. */
export const seedSuperAdmin = mutation({
  args: {
    email: v.string(),
    role: v.literal("superadmin"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { role: "superadmin" });
      return existing._id;
    }
    return null;
  },
});
