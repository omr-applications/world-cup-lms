import { v } from "convex/values";
import { query } from "./_generated/server";
import { dayWindow, groupScheduleMode, roundWindowForMatch } from "./pickWindows";
import { requireUserId } from "./utils";

export const listForGroupDay = query({
  args: {
    groupId: v.id("groups"),
    dayKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_group_user", (q) => q.eq("groupId", args.groupId).eq("userId", userId))
      .unique();
    if (!membership) {
      throw new Error("You are not a member of this group.");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found.");
    }

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_day", (q) =>
        q.eq("tournamentId", group.tournamentId).eq("dayKey", args.dayKey),
      )
      .collect();

    return await Promise.all(
      matches
        .sort((a, b) => a.kickoffAt - b.kickoffAt)
        .map(async (match) => {
          const [homeTeam, awayTeam] = await Promise.all([
            ctx.db.get(match.homeTeamId),
            ctx.db.get(match.awayTeamId),
          ]);

          return { ...match, homeTeam, awayTeam };
        }),
    );
  },
});

export const listForGroupWindow = query({
  args: {
    groupId: v.id("groups"),
    pickWindowKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_group_user", (q) => q.eq("groupId", args.groupId).eq("userId", userId))
      .unique();
    if (!membership) {
      throw new Error("You are not a member of this group.");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found.");
    }

    const scheduleMode = groupScheduleMode(group);
    const days = await ctx.db
      .query("tournamentDays")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", group.tournamentId))
      .collect();
    const daysByKey = new Map(days.map((day) => [day.dayKey, day]));
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", group.tournamentId))
      .collect();
    const windowMatches = matches.filter((match) => {
      const window =
        scheduleMode === "day"
          ? dayWindow(
              daysByKey.get(match.dayKey) ?? {
                dayKey: match.dayKey,
                label: match.dayKey,
                sortOrder: Number(match.dayKey.replaceAll("-", "")),
                firstKickoffAt: match.kickoffAt,
              },
            )
          : roundWindowForMatch(match, daysByKey.get(match.dayKey));
      return window.key === args.pickWindowKey;
    });

    return await Promise.all(
      windowMatches
        .sort((a, b) => a.kickoffAt - b.kickoffAt)
        .map(async (match) => {
          const [homeTeam, awayTeam] = await Promise.all([
            ctx.db.get(match.homeTeamId),
            ctx.db.get(match.awayTeamId),
          ]);

          return { ...match, homeTeam, awayTeam };
        }),
    );
  },
});
