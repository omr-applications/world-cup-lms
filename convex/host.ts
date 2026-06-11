import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
import { applyMatchResult } from "./results";
import { requireUserId } from "./utils";

async function assertHost(ctx: MutationCtx, groupId: Id<"groups">) {
  const userId = await requireUserId(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_group_user", (q) => q.eq("groupId", groupId).eq("userId", userId))
    .unique();

  if (!membership || membership.role !== "host") {
    throw new Error("Only the group host can do that.");
  }

  return { userId, membership };
}

export const recordResult = mutation({
  args: {
    groupId: v.id("groups"),
    matchId: v.id("matches"),
    homeScore: v.number(),
    awayScore: v.number(),
  },
  handler: async (ctx, args) => {
    await assertHost(ctx, args.groupId);
    await applyMatchResult(ctx, { ...args, resultSource: "host" });
  },
});
