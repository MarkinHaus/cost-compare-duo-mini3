import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const create = mutation({
  args: {
    roomCode: v.string(),
    name: v.string(),
    amount: v.number(),
    purpose: v.string(),
    tags: v.array(v.string()),
    isRecurring: v.boolean(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    frequency: v.optional(v.string()), // "daily", "weekly", "monthly", "annual"

    // New optional scheduling fields
    timeOfDayMinutes: v.optional(v.number()),
    monthlyDay: v.optional(v.number()),
    annualMonth: v.optional(v.number()),
    annualDay: v.optional(v.number()),

    // NEW: beneficiaries array
    beneficiaries: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Default beneficiaries when room has >2 members and not explicitly set
    let beneficiaries = args.beneficiaries;
    if (!beneficiaries || beneficiaries.length === 0) {
      const room = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q) => q.eq("code", args.roomCode.toUpperCase()))
        .unique();
      if (room && room.members.length > 2) {
        beneficiaries = room.members;
      }
    }

    // Normalize tags to lowercase for consistent comparisons
    const normalizedTags = (args.tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean);

    return await ctx.db.insert("expenses", {
      ...args,
      tags: normalizedTags, // use normalized tags
      beneficiaries,
      userId: user._id,
      createdAt: Date.now(),
    });
  },
});

export const getByRoom = query({
  args: { roomCode: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("expenses")
      .withIndex("by_room_code", (q) => q.eq("roomCode", args.roomCode))
      .collect();
  },
});

export const deleteExpense = mutation({
  args: { id: v.id("expenses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const expense = await ctx.db.get(args.id);
    if (!expense || expense.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.id);
  },
});

export const updateExpense = mutation({
  args: {
    id: v.id("expenses"),
    name: v.string(),
    amount: v.number(),
    purpose: v.string(),
    tags: v.array(v.string()),
    isRecurring: v.boolean(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    frequency: v.optional(v.string()),
    timeOfDayMinutes: v.optional(v.number()),
    monthlyDay: v.optional(v.number()),
    annualMonth: v.optional(v.number()),
    annualDay: v.optional(v.number()),
    // NEW: beneficiaries
    beneficiaries: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== user._id) {
      throw new Error("Not authorized");
    }

    // Normalize tags to lowercase for consistent comparisons
    const normalizedTags = (args.tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean);

    // Build patch; clear recurrence-specific fields when not recurring
    const patch: Record<string, unknown> = {
      name: args.name,
      amount: args.amount,
      purpose: args.purpose,
      tags: normalizedTags, // use normalized tags
      isRecurring: args.isRecurring,
      startDate: args.isRecurring ? args.startDate ?? undefined : undefined,
      endDate: args.isRecurring ? args.endDate ?? undefined : undefined,
      frequency: args.isRecurring ? args.frequency ?? undefined : undefined,
      timeOfDayMinutes: args.isRecurring ? args.timeOfDayMinutes ?? undefined : undefined,
      monthlyDay: args.isRecurring ? args.monthlyDay ?? undefined : undefined,
      annualMonth: args.isRecurring ? args.annualMonth ?? undefined : undefined,
      annualDay: args.isRecurring ? args.annualDay ?? undefined : undefined,
      // beneficiaries can always be set explicitly
      beneficiaries: args.beneficiaries ?? existing.beneficiaries,
    };

    await ctx.db.patch(args.id, patch);
  },
});