import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Generate a 6-character room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    return await ctx.db.insert("rooms", {
      code: roomCode,
      createdBy: user._id,
      members: [user._id],
      createdAt: Date.now(),
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
