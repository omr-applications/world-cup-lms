import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { dayWindow, groupScheduleMode, pickWindowKeyForPick, roundWindowForMatch } from "./pickWindows";
import { allMatchesHaveKickedOff, pickOutcome } from "./rules";

export async function applyMatchResult(
  ctx: MutationCtx,
  args: {
    groupId: Id<"groups">;
    matchId: Id<"matches">;
    homeScore: number;
    awayScore: number;
    resultSource: string;
  },
) {
  const group = await ctx.db.get(args.groupId);
  const match = await ctx.db.get(args.matchId);
  if (!group || !match || match.tournamentId !== group.tournamentId) {
    throw new Error("Choose a valid match for this group.");
  }
  if (args.homeScore < 0 || args.awayScore < 0) {
    throw new Error("Scores cannot be negative.");
  }

  const winnerTeamId =
    args.homeScore === args.awayScore
      ? undefined
      : args.homeScore > args.awayScore
        ? match.homeTeamId
        : match.awayTeamId;

  const resultSyncedAt = Date.now();
  await ctx.db.patch(match._id, {
    status: "complete",
    homeScore: args.homeScore,
    awayScore: args.awayScore,
    winnerTeamId,
    resultSource: args.resultSource,
    resultSyncedAt,
  });

  const freshMatch = { ...match, status: "complete" as const, winnerTeamId };
  const picks = await ctx.db
    .query("picks")
    .withIndex("by_match", (q) => q.eq("matchId", match._id))
    .collect();

  for (const pick of picks.filter((pick) => pick.groupId === args.groupId)) {
    const status = pickOutcome(freshMatch, pick.teamId);
    await ctx.db.patch(pick._id, {
      status,
      lockedAt: pick.lockedAt ?? match.kickoffAt,
      updatedAt: resultSyncedAt,
    });

    if (status === "lost") {
      const membership = await ctx.db.get(pick.membershipId);
      if (membership?.status === "active") {
        await ctx.db.patch(membership._id, {
          status: "eliminated",
          eliminatedAt: resultSyncedAt,
          eliminatedReason: "lost",
        });
      }
    }
  }

  const scheduleMode = groupScheduleMode(group);
  const days = await ctx.db
    .query("tournamentDays")
    .withIndex("by_tournament", (q) => q.eq("tournamentId", group.tournamentId))
    .collect();
  const daysByKey = new Map(days.map((day) => [day.dayKey, day]));
  const matchWindow =
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
  const tournamentMatches = await ctx.db
    .query("matches")
    .withIndex("by_tournament", (q) => q.eq("tournamentId", group.tournamentId))
    .collect();
  const windowMatches = tournamentMatches.filter((candidate) => {
    const candidateWindow =
      scheduleMode === "day"
        ? dayWindow(
            daysByKey.get(candidate.dayKey) ?? {
              dayKey: candidate.dayKey,
              label: candidate.dayKey,
              sortOrder: Number(candidate.dayKey.replaceAll("-", "")),
              firstKickoffAt: candidate.kickoffAt,
            },
          )
        : roundWindowForMatch(candidate, daysByKey.get(candidate.dayKey));
    return candidateWindow.key === matchWindow.key;
  });

  if (allMatchesHaveKickedOff(windowMatches, resultSyncedAt)) {
    const activeMembers = await ctx.db
      .query("memberships")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const member of activeMembers.filter((member) => member.status === "active")) {
      const memberPicks = await ctx.db
        .query("picks")
        .withIndex("by_member", (q) => q.eq("membershipId", member._id))
        .collect();
      const pick = memberPicks.find((memberPick) => pickWindowKeyForPick(memberPick) === matchWindow.key);

      if (!pick) {
        await ctx.db.patch(member._id, {
          status: "eliminated",
          eliminatedAt: resultSyncedAt,
          eliminatedReason: "no_pick",
        });
      }
    }
  }

  const remaining = (
    await ctx.db
      .query("memberships")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect()
  ).filter((member) => member.status === "active");

  if (remaining.length === 1) {
    await ctx.db.patch(remaining[0]._id, { status: "winner" });
    await ctx.db.patch(args.groupId, {
      status: "complete",
      winnerMembershipId: remaining[0]._id,
      updatedAt: resultSyncedAt,
    });
  }
}
