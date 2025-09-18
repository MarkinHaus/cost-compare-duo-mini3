import { getAuthUserId } from "@convex-dev/auth/server";
import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (user === null) {
      return null;
    }

    return user;
  },
});

/**
 * Use this function internally to get the current user data. Remember to handle the null user case.
 * @param ctx
 * @returns
 */
export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};

// Add: fetch minimal public profiles for a list of user ids
export const getProfilesByIds = query({
  args: { ids: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const results = [];
    for (const id of args.ids) {
      const u = await ctx.db.get(id);
      if (u) {
        results.push({
          _id: u._id,
          email: (u as any).email ?? null,
        });
      }
    }
    return results;
  },
});