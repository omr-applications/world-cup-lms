import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  dayWindow,
  groupScheduleMode,
  mergePickWindows,
  pickWindowKeyForPick,
  roundWindowForMatch,
  type ScheduleMode,
} from "./pickWindows";
import { ensureProfile, generateJoinCode, normalizeJoinCode, requireUserId } from "./utils";

async function uniqueJoinCode(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateJoinCode();
    const existing = await ctx.db
      .query("groups")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!existing) {
      return code;
    }
  }

  throw new Error("Could not generate a unique group code.");
}

async function collectPickWindows(
  ctx: MutationCtx | QueryCtx,
  tournamentId: Id<"tournaments">,
  scheduleMode: ScheduleMode,
) {
  const days = (
    await ctx.db
      .query("tournamentDays")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect()
  ).sort((a, b) => a.sortOrder - b.sortOrder);

  if (scheduleMode === "day") {
    return days.map(dayWindow);
  }

  const daysByKey = new Map(days.map((day) => [day.dayKey, day]));
  const matches = await ctx.db
    .query("matches")
    .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
    .collect();

  return mergePickWindows(matches.map((match) => roundWindowForMatch(match, daysByKey.get(match.dayKey))));
}

export const create = mutation({
  args: {
    name: v.string(),
    tournamentId: v.id("tournaments"),
    startDayKey: v.string(),
    startPickWindowKey: v.optional(v.string()),
    scheduleMode: v.optional(v.union(v.literal("day"), v.literal("round"))),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await ensureProfile(ctx, userId);

    const name = args.name.trim();
    if (name.length < 3) {
      throw new Error("Group name must be at least 3 characters.");
    }

    const scheduleMode = args.scheduleMode ?? "round";
    const pickWindows = await collectPickWindows(ctx, args.tournamentId, scheduleMode);
    const requestedWindowKey = args.startPickWindowKey ?? args.startDayKey;
    const startWindow = pickWindows.find((window) => window.key === requestedWindowKey);
    if (!startWindow) {
      throw new Error("Choose a valid start point.");
    }

    const now = Date.now();
    const code = await uniqueJoinCode(ctx);
    const groupId = await ctx.db.insert("groups", {
      name,
      code,
      hostUserId: userId,
      tournamentId: args.tournamentId,
      scheduleMode,
      startDayKey: startWindow.firstDayKey,
      startPickWindowKey: startWindow.key,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("memberships", {
      groupId,
      userId,
      role: "host",
      status: "active",
      joinedAt: now,
    });

    return groupId;
  },
});

export const joinByCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await ensureProfile(ctx, userId);

    const code = normalizeJoinCode(args.code);
    const group = await ctx.db
      .query("groups")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (!group) {
      throw new Error("No group found for that code.");
    }
    if (group.status !== "active") {
      throw new Error("This group is already complete.");
    }

    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_group_user", (q) => q.eq("groupId", group._id).eq("userId", userId))
      .unique();
    if (existingMembership) {
      return group._id;
    }

    const scheduleMode = groupScheduleMode(group);
    const startWindow = (await collectPickWindows(ctx, group.tournamentId, scheduleMode)).find(
      (window) => window.key === (group.startPickWindowKey ?? group.startDayKey),
    );

    if (!startWindow) {
      throw new Error("This group has an invalid start point.");
    }
    if (Date.now() >= startWindow.firstKickoffAt) {
      throw new Error("Late joins are closed for this group.");
    }

    await ctx.db.insert("memberships", {
      groupId: group._id,
      userId,
      role: "player",
      status: "active",
      joinedAt: Date.now(),
    });

    return group._id;
  },
});

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx).catch(() => null);
    if (!userId) {
      return [];
    }

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return await Promise.all(
      memberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);
        const tournament = group ? await ctx.db.get(group.tournamentId) : null;
        const memberCount = group
          ? (
              await ctx.db
                .query("memberships")
                .withIndex("by_group", (q) => q.eq("groupId", group._id))
                .collect()
            ).length
          : 0;

        return { membership, group, tournament, memberCount };
      }),
    );
  },
});

export const getDetail = query({
  args: {
    groupId: v.id("groups"),
    clientVersion: v.optional(v.number()),
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

    const tournament = await ctx.db.get(group.tournamentId);
    const days = await ctx.db
      .query("tournamentDays")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", group.tournamentId))
      .collect();
    const sortedDays = days.sort((a, b) => a.sortOrder - b.sortOrder);
    const scheduleMode = groupScheduleMode(group);
    const allPickWindows = await collectPickWindows(ctx, group.tournamentId, scheduleMode);
    const startWindow = allPickWindows.find((window) => window.key === (group.startPickWindowKey ?? group.startDayKey));
    const pickWindows = allPickWindows.filter((window) => !startWindow || window.sortOrder >= startWindow.sortOrder);
    const playableDays = sortedDays
      .filter((day) => !startWindow || day.sortOrder >= Number(startWindow.firstDayKey.replaceAll("-", "")))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const daysByKey = new Map(sortedDays.map((day) => [day.dayKey, day]));
    const members = await ctx.db
      .query("memberships")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();
    const memberRows = await Promise.all(
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
    const currentPicks = await ctx.db
      .query("picks")
      .withIndex("by_member", (q) => q.eq("membershipId", membership._id))
      .collect();
    const myPicks = await Promise.all(
      currentPicks
        .sort((a, b) => pickWindowKeyForPick(a).localeCompare(pickWindowKeyForPick(b)))
        .map(async (pick) => {
          const [team, match] = await Promise.all([ctx.db.get(pick.teamId), ctx.db.get(pick.matchId)]);
          const homeTeam = match ? await ctx.db.get(match.homeTeamId) : null;
          const awayTeam = match ? await ctx.db.get(match.awayTeamId) : null;
          return { ...pick, team, match: match ? { ...match, homeTeam, awayTeam } : null };
        }),
    );
    const allMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", group.tournamentId))
      .collect();
    const matchesByWindow = await Promise.all(
      pickWindows.map(async (window) => {
        const matches = allMatches.filter((match) => {
          const matchWindow =
            scheduleMode === "day" ? dayWindow(daysByKey.get(match.dayKey) ?? {
              dayKey: match.dayKey,
              label: match.dayKey,
              sortOrder: Number(match.dayKey.replaceAll("-", "")),
              firstKickoffAt: match.kickoffAt,
            }) : roundWindowForMatch(match, daysByKey.get(match.dayKey));
          return matchWindow.key === window.key;
        });

        return {
          pickWindowKey: window.key,
          matches: await Promise.all(
            matches
              .sort((a, b) => a.kickoffAt - b.kickoffAt)
              .map(async (match) => {
                const [homeTeam, awayTeam] = await Promise.all([
                  ctx.db.get(match.homeTeamId),
                  ctx.db.get(match.awayTeamId),
                ]);

                return { ...match, homeTeam, awayTeam };
              }),
          ),
        };
      }),
    );
    const standings = [...memberRows].sort((a, b) => {
      const statusRank = (status: string) => (status === "winner" ? 0 : status === "active" ? 1 : 2);
      return statusRank(a.membership.status) - statusRank(b.membership.status) || b.wins - a.wins;
    });

    return {
      group,
      tournament,
      currentMembership: membership,
      days: playableDays,
      pickWindows,
      members: memberRows,
      standings,
      myPicks,
      matchesByDay: matchesByWindow.map((window) => ({
        dayKey: window.pickWindowKey,
        matches: window.matches,
      })),
      matchesByWindow,
    };
  },
});
