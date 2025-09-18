import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      
      // Subscription fields
      premium: v.optional(v.boolean()),
      plan: v.optional(v.string()),
      trialEnd: v.optional(v.number()),
      billingCustomerId: v.optional(v.string()),
      billingProvider: v.optional(v.string()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    rooms: defineTable({
      code: v.string(),
      createdBy: v.id("users"),
      members: v.array(v.id("users")),
      createdAt: v.number(),
      // Add: maximum number of members allowed in the room
      maxMembers: v.number(),
    })
      .index("by_code", ["code"])
      .index("by_member", ["members"]),

    expenses: defineTable({
      roomCode: v.string(),
      userId: v.id("users"),
      name: v.string(),
      amount: v.number(),
      purpose: v.string(),
      tags: v.array(v.string()),
      isRecurring: v.boolean(),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      frequency: v.optional(v.string()),
      createdAt: v.number(),

      // Add optional recurrence scheduling fields for correct accumulation
      timeOfDayMinutes: v.optional(v.number()), // for "daily": minutes since midnight (0..1439)
      monthlyDay: v.optional(v.number()),       // for "monthly": day of month (1..31)
      annualMonth: v.optional(v.number()),      // for "annual": month (1..12)
      annualDay: v.optional(v.number()),        // for "annual": day of month (1..31)
    })
      .index("by_room_code", ["roomCode"])
      .index("by_user", ["userId"])
      .index("by_room_and_user", ["roomCode", "userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;