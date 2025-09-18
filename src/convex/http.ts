import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// Stripe webhook: /api/stripe/webhook
http.route({
  path: "/api/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
    }

    // Obtain the raw text body and signature
    const sig = req.headers.get("stripe-signature") || "";
    const payload = await req.text();

    // Verify signature (v1)
    const valid = await verifyStripeSignature(payload, sig, secret);
    if (!valid) return new Response("Invalid signature", { status: 400 });

    let event: any;
    try {
      event = JSON.parse(payload);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Handle relevant events
    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object as {
            id: string;
            customer: string;
            metadata?: Record<string, string>;
            cancel_at_period_end?: boolean;
            plan?: { nickname?: string };
            current_period_end?: number;
            status?: string;
            trial_end?: number | null;
          };
          const userId = subscription.metadata?.userId;
          if (userId) {
            await ctx.runMutation(internal.subscriptions.upsertFromStripe, {
              userId: userId as any,
              premium: subscription.status === "active" || subscription.status === "trialing",
              plan: subscription.metadata?.plan ?? subscription.plan?.nickname ?? "pro",
              billingCustomerId: subscription.customer,
              billingSubscriptionId: subscription.id,
              trialEnd: subscription.trial_end ?? undefined,
              cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
              billingProvider: "stripe",
            });
          }
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object as {
            id: string;
            metadata?: Record<string, string>;
          };
          const userId = subscription.metadata?.userId;
          if (userId) {
            await ctx.runMutation(internal.subscriptions.upsertFromStripe, {
              userId: userId as any,
              premium: false,
              plan: undefined,
              billingCustomerId: undefined,
              billingSubscriptionId: undefined,
              trialEnd: undefined,
              cancelAtPeriodEnd: false,
              billingProvider: "stripe",
            });
          }
          break;
        }
        default:
          // ignore other events
          break;
      }
    } catch (e) {
      return new Response(`Webhook handling error: ${(e as Error).message}`, { status: 500 });
    }

    return new Response("ok", { status: 200 });
  }),
});

export default http;

// Verify Stripe signature using HMAC SHA256 (v1)
async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  try {
    const parts = sigHeader.split(",").reduce<Record<string, string>>((acc, part) => {
      const [k, v] = part.split("=");
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    }, {});
    const t = parts["t"];
    const v1 = parts["v1"];
    if (!t || !v1) return false;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    const signedPayload = `${t}.${payload}`;
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    const expected = bufferToHex(signature);
    return timingSafeEqual(expected, v1);
  } catch {
    return false;
  }
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const hex: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const h = bytes[i].toString(16).padStart(2, "0");
    hex.push(h);
  }
  return hex.join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}