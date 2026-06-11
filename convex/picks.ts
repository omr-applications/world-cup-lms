import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  canChangePick,
  hasTeamAlreadyBeenUsed,
  isMatchPickable,
  pickOutcome,
  selectedTeamIsInMatch,
} from "./rules";
import { dayWindow, groupScheduleMode, pickWindowKeyForPick, roundWindowForMatch } from "./pickWindows";
import { requireUserId } from "./utils";

export const upsert = mutation({
  args: {
    groupId: v.id("groups"),
    dayKey: v.string(),
    pickWindowKey: v.optional(v.string()),
    matchId: v.id("matches"),
    teamId: v.id("teams"),
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
    if (membership.status !== "active") {
      throw new Error("Only active players can make picks.");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group || group.status !== "active") {
      throw new Error("This group is not active.");
    }

    const match = await ctx.db.get(args.matchId);
    if (!match || match.dayKey !== args.dayKey || match.tournamentId !== group.tournamentId) {
      throw new Error("Choose a valid match for this group.");
    }
    const scheduleMode = groupScheduleMode(group);
    const day = await ctx.db
      .query("tournamentDays")
      .withIndex("by_tournament_day", (q) =>
        q.eq("tournamentId", group.tournamentId).eq("dayKey", match.dayKey),
      )
      .unique();
    const matchWindow =
      scheduleMode === "day"
        ? dayWindow(
            day ?? {
              dayKey: match.dayKey,
              label: match.dayKey,
              sortOrder: Number(match.dayKey.replaceAll("-", "")),
              firstKickoffAt: match.kickoffAt,
            },
          )
        : roundWindowForMatch(match, day ?? undefined);
    const pickWindowKey = args.pickWindowKey ?? args.dayKey;
    if (matchWindow.key !== pickWindowKey) {
      throw new Error("Choose a match from the selected pick window.");
    }

    const now = Date.now();
    if (!isMatchPickable(match, now)) {
      throw new Error("That match has already locked.");
    }
    if (!selectedTeamIsInMatch(match, args.teamId)) {
      throw new Error("Choose a team from the selected match.");
    }

    const memberPicks = await ctx.db
      .query("picks")
      .withIndex("by_member", (q) => q.eq("membershipId", membership._id))
      .collect();
    const existingPick = memberPicks.find((pick) => pickWindowKeyForPick(pick) === pickWindowKey);
    const existingPickMatch = existingPick ? await ctx.db.get(existingPick.matchId) : null;

    if (!canChangePick(existingPickMatch, now)) {
      throw new Error("Your pick has locked because that match has kicked off.");
    }

    if (hasTeamAlreadyBeenUsed(memberPicks, args.teamId, pickWindowKey, group.selectionResetAt)) {
      throw new Error("You have already used that team in this group.");
    }

    if (existingPick) {
      await ctx.db.patch(existingPick._id, {
        matchId: args.matchId,
        teamId: args.teamId,
        dayKey: args.dayKey,
        pickWindowKey,
        status: pickOutcome(match, args.teamId),
        updatedAt: now,
        lockedAt: undefined,
      });
      return existingPick._id;
    }

    return await ctx.db.insert("picks", {
      groupId: args.groupId,
      membershipId: membership._id,
      userId,
      dayKey: args.dayKey,
      pickWindowKey,
      matchId: args.matchId,
      teamId: args.teamId,
      status: pickOutcome(match, args.teamId),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listMine = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_group_user", (q) => q.eq("groupId", args.groupId).eq("userId", userId))
      .unique();

    if (!membership) {
      return [];
    }

    const picks = await ctx.db
      .query("picks")
      .withIndex("by_member", (q) => q.eq("membershipId", membership._id))
      .collect();

    return await Promise.all(
      picks
        .sort((a, b) => pickWindowKeyForPick(a).localeCompare(pickWindowKeyForPick(b)))
        .map(async (pick) => {
          const [team, match] = await Promise.all([ctx.db.get(pick.teamId), ctx.db.get(pick.matchId)]);
          const homeTeam = match ? await ctx.db.get(match.homeTeamId) : null;
          const awayTeam = match ? await ctx.db.get(match.awayTeamId) : null;
          return { ...pick, team, match: match ? { ...match, homeTeam, awayTeam } : null };
        }),
    );
  },
});
