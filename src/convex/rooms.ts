import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const create = mutation({
  args: { maxMembers: v.optional(v.number()), currencyCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Generate a 6-character room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Default to 2 if not provided; clamp to at least 2
    const maxMembers = Math.max(2, Math.floor(args.maxMembers ?? 2));

    // Map currency code to symbol (server-trusted)
    const code = (args.currencyCode ?? "USD").toUpperCase();
    const symbolMap: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      INR: "₹",
      AUD: "A$",
      CAD: "C$",
      CHF: "CHF",
    };
    const currencySymbol = symbolMap[code] ?? "$";

    return await ctx.db.insert("rooms", {
      code: roomCode,
      createdBy: user._id,
      members: [user._id],
      createdAt: Date.now(),
      maxMembers,
      currencyCode: code,
      currencySymbol,
    });
  },
});

export const join = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();

    if (!room) throw new Error("Room not found");

    // Enforce capacity
    if (room.members.length >= room.maxMembers) {
      throw new Error("Room is full");
    }

    if (!room.members.includes(user._id)) {
      await ctx.db.patch(room._id, {
        members: [...room.members, user._id],
      });
    }

    return room;
  },
});

export const getUserRoom = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const rooms = await ctx.db.query("rooms").collect();
    return rooms.find(room => room.members.includes(user._id)) || null;
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
  },
});