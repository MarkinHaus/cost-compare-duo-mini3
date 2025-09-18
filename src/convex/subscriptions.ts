import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
/* removed unused internal import */

export const startTrial = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // If already premium, no-op
    if (user.premium) {
      return;
    }

    const trialEnd = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.patch(user._id, {
      premium: true,
      plan: "pro",
      trialEnd,
      billingProvider: "trial",
    });
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const now = Date.now();
    const trialActive = user.trialEnd ? now < user.trialEnd : false;

    return {
      premium: user.premium || false,
      plan: user.plan,
      trialActive,
      trialEnd: user.trialEnd,
    };
  },
});

export const getPricing = query({
  args: {},
  handler: async (ctx) => {
    const cfg = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "pricing"))
      .unique();

    return {
      planName: cfg?.planName ?? "pro",
      planPriceCents: cfg?.planPriceCents ?? 120,
      currency: cfg?.currency ?? "usd",
    };
  },
});

// Internal: upsert user billing state from Stripe webhook
export const upsertFromStripe = internalMutation({
  args: {
    userId: v.id("users"),
    premium: v.boolean(),
    plan: v.optional(v.string()),
    billingCustomerId: v.optional(v.string()),
    billingSubscriptionId: v.optional(v.string()),
    trialEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    billingProvider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.userId);
    if (!existing) return;
    await ctx.db.patch(args.userId, {
      premium: args.premium,
      plan: args.plan ?? existing.plan,
      billingCustomerId: args.billingCustomerId ?? existing.billingCustomerId,
      billingSubscriptionId: args.billingSubscriptionId ?? existing.billingSubscriptionId,
      trialEnd: args.trialEnd ?? existing.trialEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd ?? existing.cancelAtPeriodEnd,
      billingProvider: args.billingProvider ?? existing.billingProvider,
    });
  },
});

// Internal: fetch current user doc for actions
export const currentUserRaw = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return user ?? null;
  },
});

export const downgradeToFreeAndPrune = mutation({
  args: { keepRoomCode: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Ensure chosen room exists and user is a member, and has <= 3 members
    const keepRoom = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.keepRoomCode.toUpperCase()))
      .unique();

    if (!keepRoom) throw new Error("Selected room not found");
    if (!keepRoom.members.includes(user._id)) {
      throw new Error("You are not a member of the selected room");
    }
    if (keepRoom.members.length > 3) {
      throw new Error("Selected room must have 3 or fewer members");
    }

    // List all rooms user belongs to
    const myRooms = await ctx.db
      .query("rooms")
      .withIndex("by_member", (q) => q.eq("members", user._id as any))
      .collect();

    // Delete all other rooms owned by user (cannot leave rooms user doesn't own)
    for (const room of myRooms) {
      if (room.code === keepRoom.code) continue;

      if (room.createdBy === user._id) {
        // delete all expenses for this room
        const expenses = await ctx.db
          .query("expenses")
          .withIndex("by_room_code", (q) => q.eq("roomCode", room.code))
          .collect();
        for (const e of expenses) {
          await ctx.db.delete(e._id);
        }
        // delete the room
        await ctx.db.delete(room._id);
      } else {
        // Not allowed to leave rooms; surface a clear error
        throw new Error(
          `Cannot downgrade: you belong to room ${room.code} you don't own. Leaving rooms is not allowed.`
        );
      }
    }

    // Set user to free
    await ctx.db.patch(user._id, {
      premium: false,
      billingProvider: "trial", // keep provenance
      plan: undefined,
      cancelAtPeriodEnd: false,
    });

    return { ok: true };
  },
});

/* moved cancelAtPeriodEnd to a Node action in subscriptions_actions.ts */