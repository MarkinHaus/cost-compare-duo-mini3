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

/* moved cancelAtPeriodEnd to a Node action in subscriptions_actions.ts */