import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { roleValidator } from "./schema";

// Admin email - hardcoded and not exposed to frontend
const ADMIN_EMAIL = "markinhausmanns@gmail.com";

// Enhance admin checks to also validate the users document and use case-insensitive comparison
function isAdminEmail(email: string | null | undefined) {
  return (email ?? "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    let authorized = isAdminEmail(identity?.email);

    if (!authorized) {
      try {
        const currentUser = await getCurrentUser(ctx);
        authorized = isAdminEmail(currentUser?.email);
      } catch {
        // ignore
      }
    }

    if (!authorized) {
      return [];
    }

    const users = await ctx.db.query("users").collect();
    return users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      premium: user.premium,
      plan: user.plan,
      trialEnd: user.trialEnd,
    }));
  },
});

export const setUserRole = mutation({
  args: { userId: v.id("users"), role: roleValidator },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.userId, { role: args.role });
  },
});

export const setUserPremium = mutation({
  args: { 
    userId: v.id("users"), 
    premium: v.boolean(),
    plan: v.optional(v.string()),
    trialEnd: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.userId, {
      premium: args.premium,
      plan: args.plan,
      trialEnd: args.trialEnd,
    });
  },
});

// NEW: getConfig (admin only)
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    let authorized = isAdminEmail(identity?.email);

    if (!authorized) {
      try {
        const currentUser = await getCurrentUser(ctx);
        authorized = isAdminEmail(currentUser?.email);
      } catch {
        // ignore
      }
    }

    if (!authorized) {
      return null;
    }

    const existing = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "pricing"))
      .unique();

    // Return defaults if missing; do not write inside a query
    if (!existing) {
      return {
        key: "pricing",
        planName: "pro",
        planPriceCents: 120,
        currency: "usd",
      };
    }
    return existing;
  },
});

// NEW: setConfig (admin only)
export const setConfig = mutation({
  args: {
    planName: v.string(),
    planPriceCents: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
      throw new Error("Not authorized");
    }
    const existing = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "pricing"))
      .unique();
    if (!existing) {
      await ctx.db.insert("appConfig", {
        key: "pricing",
        planName: args.planName,
        planPriceCents: args.planPriceCents,
        currency: args.currency,
      });
    } else {
      await ctx.db.patch(existing._id, {
        planName: args.planName,
        planPriceCents: args.planPriceCents,
        currency: args.currency,
      });
    }
  },
});