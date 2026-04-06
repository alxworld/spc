import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v, ConvexError } from "convex/values";

/** Returns the full user record for the currently authenticated user. */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    // Clerk subject is the plain Clerk user ID — no splitting needed
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

/** Returns all users — admin only. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me || (me.role !== "admin" && me.role !== "superadmin")) {
      throw new ConvexError("Admin access required");
    }
    return await ctx.db.query("users").take(200);
  },
});

/** Internal lookup by Clerk ID — used by the chat action. */
export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

/** Upsert a user record from Clerk webhook (user.created / user.updated). */
export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { email: args.email, name: args.name });
    } else {
      await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        role: "user",
      });
    }
  },
});

/** Delete a user record from Clerk webhook (user.deleted). */
export const deleteByClerkId = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (user) await ctx.db.delete(user._id);
  },
});

/** Promote a user to superadmin by email. */
export const seedSuperAdmin = mutation({
  args: { email: v.string(), role: v.literal("superadmin") },
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
