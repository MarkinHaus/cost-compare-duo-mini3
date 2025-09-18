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

    const trialEnd = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

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

export const getCheckoutUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Placeholder for Autumn checkout integration
    // For now, return a mock URL to keep app compiling
    return "/pay";
  },
});
