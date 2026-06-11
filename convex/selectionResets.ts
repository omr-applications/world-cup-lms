import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./utils";

async function requireActiveMember(ctx: MutationCtx | QueryCtx, groupId: Id<"groups">) {
  const { userId, membership, group } = await requireMember(ctx, groupId);

  if (membership.status !== "active") {
    throw new Error("Only remaining active players can reset selections.");
  }
  if (group.status !== "active") {
    throw new Error("This group is not active.");
  }

  return { userId, membership, group };
}

async function requireMember(ctx: MutationCtx | QueryCtx, groupId: Id<"groups">) {
  const userId = await requireUserId(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_group_user", (q) => q.eq("groupId", groupId).eq("userId", userId))
    .unique();

  if (!membership) {
    throw new Error("You are not a member of this group.");
  }

  const group = await ctx.db.get(groupId);
  if (!group) {
    throw new Error("Group not found.");
  }

  return { userId, membership, group };
}

export const getStatus = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const { userId, membership, group } = await requireMember(ctx, args.groupId);
    const activeMembers = (
      await ctx.db
        .query("memberships")
        .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
        .collect()
    ).filter((member) => member.status === "active");

    const requestedAt = group.selectionResetRequestedAt;
    const votes = requestedAt
      ? (
          await ctx.db
            .query("selectionResetVotes")
            .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
            .collect()
        ).filter((vote) => vote.requestedAt === requestedAt)
      : [];
    const activeMemberIds = new Set(activeMembers.map((activeMember) => activeMember._id));
    const approvedCount = new Set(
      votes
        .filter((vote) => activeMemberIds.has(vote.membershipId))
        .map((vote) => vote.membershipId),
    ).size;

    return {
      requestedAt,
      requestedByMe: group.selectionResetRequestedBy === userId,
      lastResetAt: group.selectionResetAt,
      activeCount: activeMembers.length,
      approvedCount,
      approvedByMe: votes.some((vote) => vote.membershipId === membership._id),
      canVote: membership.status === "active" && group.status === "active",
    };
  },
});

export const request = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const { userId, membership, group } = await requireActiveMember(ctx, args.groupId);
    const requestedAt = Date.now();

    await ctx.db.patch(group._id, {
      selectionResetRequestedAt: requestedAt,
      selectionResetRequestedBy: userId,
      updatedAt: requestedAt,
    });

    await ctx.db.insert("selectionResetVotes", {
      groupId: args.groupId,
      membershipId: membership._id,
      userId,
      requestedAt,
      createdAt: requestedAt,
    });

    return await maybeCompleteReset(ctx, args.groupId, requestedAt);
  },
});

export const approve = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const { userId, membership, group } = await requireActiveMember(ctx, args.groupId);
    const requestedAt = group.selectionResetRequestedAt;
    if (!requestedAt) {
      throw new Error("No selection reset has been proposed.");
    }

    const existingVote = (
      await ctx.db
        .query("selectionResetVotes")
        .withIndex("by_group_membership", (q) =>
          q.eq("groupId", args.groupId).eq("membershipId", membership._id),
        )
        .collect()
    ).find((vote) => vote.requestedAt === requestedAt);

    if (!existingVote) {
      await ctx.db.insert("selectionResetVotes", {
        groupId: args.groupId,
        membershipId: membership._id,
        userId,
        requestedAt,
        createdAt: Date.now(),
      });
    }

    return await maybeCompleteReset(ctx, args.groupId, requestedAt);
  },
});

async function maybeCompleteReset(ctx: MutationCtx, groupId: Id<"groups">, requestedAt: number) {
  const activeMembers = (
    await ctx.db
      .query("memberships")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect()
  ).filter((member) => member.status === "active");

  const votes = (
    await ctx.db
      .query("selectionResetVotes")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect()
  ).filter((vote) => vote.requestedAt === requestedAt);

  const activeMemberIds = new Set(activeMembers.map((member) => member._id));
  const approvedCount = new Set(
    votes.filter((vote) => activeMemberIds.has(vote.membershipId)).map((vote) => vote.membershipId),
  ).size;

  if (activeMembers.length > 0 && approvedCount >= activeMembers.length) {
    const now = Date.now();
    await ctx.db.patch(groupId, {
      selectionResetAt: now,
      selectionResetRequestedAt: undefined,
      selectionResetRequestedBy: undefined,
      updatedAt: now,
    });
    return { completed: true, approvedCount, activeCount: activeMembers.length };
  }

  return { completed: false, approvedCount, activeCount: activeMembers.length };
}
