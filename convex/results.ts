import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
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

  const dayMatches = await ctx.db
    .query("matches")
    .withIndex("by_tournament_day", (q) =>
      q.eq("tournamentId", group.tournamentId).eq("dayKey", match.dayKey),
    )
    .collect();

  if (allMatchesHaveKickedOff(dayMatches, resultSyncedAt)) {
    const activeMembers = await ctx.db
      .query("memberships")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const member of activeMembers.filter((member) => member.status === "active")) {
      const pick = await ctx.db
        .query("picks")
        .withIndex("by_member_day", (q) =>
          q.eq("membershipId", member._id).eq("dayKey", match.dayKey),
        )
        .unique();

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
