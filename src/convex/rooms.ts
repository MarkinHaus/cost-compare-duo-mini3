import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

export const create = mutation({
  args: { maxMembers: v.optional(v.number()), currencyCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Determine premium/trial status and auto-expire trial if needed
    const now = Date.now();
    let isPremium = !!user.premium;
    if (user.billingProvider === "trial") {
      const trialActive = !!user.trialEnd && now < user.trialEnd!;
      if (!trialActive) {
        if (user.premium) {
          await ctx.db.patch(user._id, { premium: false, trialEnd: undefined, trialUsed: true });
        } else {
          await ctx.db.patch(user._id, { trialEnd: undefined, trialUsed: true });
        }
        isPremium = false;
      } else {
        isPremium = true;
      }
    }

    // Auto-start trial if user has no plan set yet (limited premium) and hasn't used it
    if (!user.premium && !user.trialEnd && user.billingProvider !== "stripe" && !user.trialUsed) {
      const trialEnd = now + 7 * 24 * 60 * 60 * 1000;
      await ctx.db.patch(user._id, {
        premium: true,
        plan: "pro",
        trialStart: now,
        trialEnd,
        billingProvider: "trial",
      });
      isPremium = true;
    }

    // Enforce membership count for free users (max 1 room total)
    if (!isPremium) {
      const myRooms = await ctx.db
        .query("rooms")
        .withIndex("by_member", (q) => q.eq("members", user._id as any))
        .collect();
      if (myRooms.length >= 1) {
        throw new Error("Free users can only belong to one room");
      }
    }

    // Generate a 6-character room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Default to 2 if not provided; clamp to at least 2
    // For free users, clamp to at most 3 members
    const requestedMax = Math.max(2, Math.floor(args.maxMembers ?? 2));
    const maxMembers = !isPremium ? Math.min(3, requestedMax) : requestedMax;

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

    // Determine premium/trial status and auto-expire trial if needed
    const now = Date.now();
    let isPremium = !!user.premium;
    if (user.billingProvider === "trial") {
      const trialActive = !!user.trialEnd && now < user.trialEnd!;
      if (!trialActive) {
        if (user.premium) {
          await ctx.db.patch(user._id, { premium: false, trialEnd: undefined, trialUsed: true });
        } else {
          await ctx.db.patch(user._id, { trialEnd: undefined, trialUsed: true });
        }
        isPremium = false;
      } else {
        isPremium = true;
      }
    }

    // Auto-start trial if user has no plan set yet (limited premium) and hasn't used it
    if (!user.premium && !user.trialEnd && user.billingProvider !== "stripe" && !user.trialUsed) {
      const trialEnd = now + 7 * 24 * 60 * 60 * 1000;
      await ctx.db.patch(user._id, {
        premium: true,
        plan: "pro",
        trialStart: now,
        trialEnd,
        billingProvider: "trial",
      });
      isPremium = true;
    }

    // Enforce membership count for free users (max 1 room total)
    if (!isPremium) {
      const myRooms = await ctx.db
        .query("rooms")
        .withIndex("by_member", (q) => q.eq("members", user._id as any))
        .collect();
      if (myRooms.length >= 1) {
        throw new Error("Free users can only belong to one room");
      }
    }

    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();

    if (!room) throw new Error("Room not found");

    // Enforce capacity always
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

export const listMyRooms = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    // Collect all rooms and filter by membership + ownership
    const allRooms: Array<Doc<"rooms">> = await ctx.db.query("rooms").collect();
    const memberRooms = allRooms.filter((r) => r.members.includes(user._id));
    return memberRooms.filter((r) => r.createdBy === user._id);
  },
});

export const listMemberRooms = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    // Collect all rooms and filter by membership, excluding rooms owned by the user
    const allRooms: Array<Doc<"rooms">> = await ctx.db.query("rooms").collect();
    const memberRooms = allRooms.filter((r) => r.members.includes(user._id));
    return memberRooms.filter((r) => r.createdBy !== user._id);
  },
});

// Add: Allow owners to delete their room and its expenses (uses indexes "by_code" and "by_roomCode")
export const removeMyRoom = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    // Use helper to avoid circular api types
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (!room) {
      throw new Error("Room not found");
    }
    if (room.createdBy !== user._id) {
      throw new Error("Only the room owner can delete this room");
    }

    // Delete all expenses associated with this room
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_room_code", (q) => q.eq("roomCode", room.code))
      .collect();

    for (const e of expenses) {
      await ctx.db.delete(e._id);
    }

    // Delete the room
    await ctx.db.delete(room._id);
    return true;
  },
});