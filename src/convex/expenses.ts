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
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    return await ctx.db.insert("expenses", {
      ...args,
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