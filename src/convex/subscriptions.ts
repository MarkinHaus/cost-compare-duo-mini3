import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

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