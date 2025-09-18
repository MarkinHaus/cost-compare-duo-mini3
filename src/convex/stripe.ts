"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

// Helper to call Stripe REST API with x-www-form-urlencoded body
async function stripeRequest<T>(secretKey: string, path: string, body: Record<string, string | number | boolean>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    params.append(k, String(v));
  }

  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe error ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export const createPaymentLink = action({
  args: {
    amountCents: v.number(),
    currency: v.string(),
    planName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }

    const amount = args.amountCents;
    const currency = args.currency;
    const planName = args.planName;

    // 1) Create a recurring monthly Price (auto product)
    type StripePrice = { id: string };
    const price = await stripeRequest<StripePrice>(secret, "prices", {
      unit_amount: amount,
      currency,
      "recurring[interval]": "month",
      "product_data[name]": `${planName} plan`,
    });

    // 2) Create a Payment Link with subscription metadata so webhook can identify user
    type StripePaymentLink = { url: string };
    const link = await stripeRequest<StripePaymentLink>(secret, "payment_links", {
      "line_items[0][price]": price.id,
      "line_items[0][quantity]": 1,
      allow_promotion_codes: false,
      // after completion redirect back to app (optional but helpful)
      "after_completion[type]": "redirect",
      "after_completion[redirect][url]": `${(process.env.APP_BASE_URL as string) || ""}/dashboard?stripe=success`,
      // ensure metadata propagates to the Subscription created by Checkout
      "subscription_data[metadata][userId]": String(identity.subject),
      "subscription_data[metadata][plan]": planName,
    });

    return link.url;
  },
});

/**
 * Internal action: Set Stripe subscription to cancel at period end.
 * DB updates are handled by a public mutation to avoid importing internal refs in Node runtime files.
 */
export const cancelAtPeriodEndInternal = internalAction({
  args: { subscriptionId: v.string() },
  handler: async (ctx, args) => {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }

    type StripeSubscription = { id: string; cancel_at_period_end: boolean };
    await stripeRequest<StripeSubscription>(secret, `subscriptions/${args.subscriptionId}`, {
      cancel_at_period_end: true,
    });

    return "ok";
  },
});