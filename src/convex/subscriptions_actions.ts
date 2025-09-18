"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";

/**
 * Cancel Now action:
 * - Immediately downgrades the user and prunes rooms via mutation.
 * - Intentionally idempotent.
 * - Stripe immediate cancellation can be added here if desired, but is optional for enforcement.
 */
export const cancelNow = action({
  args: {},
  handler: async (ctx) => {
    // Optional: could call a Stripe "cancel now" internal action here if available.
    // Ensure the local system is updated atomically.
    await ctx.runMutation(api.subscriptions.downgradeNowAuto, {});
    return { ok: true };
  },
});

export const cancelAtPeriodEnd = action({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.runQuery(internal.subscriptions.currentUserRaw, {});
    if (!user) throw new Error("Not authenticated");
    if (!user.billingSubscriptionId) throw new Error("No active subscription");

    await ctx.runAction(internal.stripe.cancelAtPeriodEndInternal, {
      subscriptionId: user.billingSubscriptionId,
    });

    await ctx.runMutation(internal.subscriptions.upsertFromStripe, {
      userId: user._id,
      premium: true,
      plan: user.plan,
      billingCustomerId: user.billingCustomerId,
      billingSubscriptionId: user.billingSubscriptionId,
      trialEnd: user.trialEnd,
      cancelAtPeriodEnd: true,
      billingProvider: "stripe",
    });
  },
});