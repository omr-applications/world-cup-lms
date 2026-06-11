import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUserId } from "./utils";

export const get = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const currentMembership = await ctx.db
      .query("memberships")
      .withIndex("by_group_user", (q) => q.eq("groupId", args.groupId).eq("userId", userId))
      .unique();
    if (!currentMembership) {
      throw new Error("You are not a member of this group.");
    }

    const members = await ctx.db
      .query("memberships")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const rows = await Promise.all(
      members.map(async (member) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", member.userId))
          .unique();
        const user = await ctx.db.get(member.userId);
        const picks = await ctx.db
          .query("picks")
          .withIndex("by_member", (q) => q.eq("membershipId", member._id))
          .collect();

        return {
          membership: member,
          displayName: profile?.displayName ?? user?.email ?? "Player",
          picksMade: picks.length,
          wins: picks.filter((pick) => pick.status === "won").length,
          usedTeamIds: picks.map((pick) => pick.teamId),
        };
      }),
    );

    return rows.sort((a, b) => {
      const statusRank = (status: string) => (status === "winner" ? 0 : status === "active" ? 1 : 2);
      return statusRank(a.membership.status) - statusRank(b.membership.status) || b.wins - a.wins;
    });
  },
});
