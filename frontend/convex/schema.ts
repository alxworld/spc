import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // No authTables — Clerk manages auth state externally

  users: defineTable({
    clerkId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("user"), v.literal("admin"), v.literal("superadmin"))
    ),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("email", ["email"]),

  bookings: defineTable({
    userId: v.id("users"),
    date: v.string(),       // YYYY-MM-DD
    startTime: v.string(),  // HH:MM
    endTime: v.string(),    // HH:MM
    purpose: v.string(),
    attendees: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_date", ["userId", "date"])
    .index("by_date_and_status", ["date", "status"])
    .index("by_status", ["status"]),

  blockedDates: defineTable({
    date: v.string(),   // YYYY-MM-DD
    reason: v.string(),
  })
    .index("by_date", ["date"]),
});
