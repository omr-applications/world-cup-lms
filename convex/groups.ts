import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
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

export const create = mutation({
  args: {
    name: v.string(),
    tournamentId: v.id("tournaments"),
    startDayKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await ensureProfile(ctx, userId);

    const name = args.name.trim();
    if (name.length < 3) {
      throw new Error("Group name must be at least 3 characters.");
    }

    const day = await ctx.db
      .query("tournamentDays")
      .withIndex("by_tournament_day", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("dayKey", args.startDayKey),
      )
      .unique();
    if (!day) {
      throw new Error("Choose a valid start day.");
    }

    const now = Date.now();
    const code = await uniqueJoinCode(ctx);
    const groupId = await ctx.db.insert("groups", {
      name,
      code,
      hostUserId: userId,
      tournamentId: args.tournamentId,
      startDayKey: args.startDayKey,
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

    const startDay = await ctx.db
      .query("tournamentDays")
      .withIndex("by_tournament_day", (q) =>
        q.eq("tournamentId", group.tournamentId).eq("dayKey", group.startDayKey),
      )
      .unique();

    if (!startDay) {
      throw new Error("This group has an invalid start day.");
    }
    if (Date.now() >= startDay.firstKickoffAt) {
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
    const playableDays = days
      .filter((day) => day.sortOrder >= Number(group.startDayKey.replaceAll("-", "")))
      .sort((a, b) => a.sortOrder - b.sortOrder);
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
        .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
        .map(async (pick) => {
          const [team, match] = await Promise.all([ctx.db.get(pick.teamId), ctx.db.get(pick.matchId)]);
          const homeTeam = match ? await ctx.db.get(match.homeTeamId) : null;
          const awayTeam = match ? await ctx.db.get(match.awayTeamId) : null;
          return { ...pick, team, match: match ? { ...match, homeTeam, awayTeam } : null };
        }),
    );
    const matchesByDay = await Promise.all(
      playableDays.map(async (day) => {
        const matches = await ctx.db
          .query("matches")
          .withIndex("by_tournament_day", (q) =>
            q.eq("tournamentId", group.tournamentId).eq("dayKey", day.dayKey),
          )
          .collect();

        return {
          dayKey: day.dayKey,
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
      members: memberRows,
      standings,
      myPicks,
      matchesByDay,
    };
  },
});
