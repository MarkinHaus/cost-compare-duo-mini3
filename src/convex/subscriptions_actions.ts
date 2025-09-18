"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";

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
