import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ensureProfile, requireUserId } from "./utils";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return { user, profile };
  },
});

export const ensureMe = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ensureProfile(ctx, userId);
  },
});

export const updateProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const firstName = args.firstName.trim();
    const lastName = args.lastName.trim();
    if (firstName.length < 1 || lastName.length < 1) {
      throw new Error("First and last name are required.");
    }

    const profile = await ensureProfile(ctx, userId);
    if (!profile) {
      throw new Error("Could not create profile.");
    }

    await ctx.db.patch(profile._id, {
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      updatedAt: Date.now(),
    });
  },
});
