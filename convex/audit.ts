import { query } from "./_generated/server";

export const worldCupSeedSummary = query({
  args: {},
  handler: async (ctx) => {
    const tournament = await ctx.db
      .query("tournaments")
      .withIndex("by_slug", (q) => q.eq("slug", "world-cup-2026"))
      .unique();
    if (!tournament) {
      return null;
    }

    const [teams, matches, days] = await Promise.all([
      ctx.db
        .query("teams")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect(),
      ctx.db
        .query("matches")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect(),
      ctx.db
        .query("tournamentDays")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect(),
    ]);

    const matchesByRound = matches.reduce<Record<string, number>>((counts, match) => {
      const round = match.round ?? "Unknown";
      counts[round] = (counts[round] ?? 0) + 1;
      return counts;
    }, {});

    return {
      teams: teams.length,
      matches: matches.length,
      days: days.length,
      missingFlags: teams.filter((team) => !team.flagUrl).map((team) => team.code),
      missingRanks: teams.filter((team) => !team.fifaRank).map((team) => team.code),
      matchesByRound,
      fixtures: await Promise.all(
        matches
          .sort((a, b) => a.matchNumber - b.matchNumber)
          .map(async (match) => {
            const [homeTeam, awayTeam] = await Promise.all([
              ctx.db.get(match.homeTeamId),
              ctx.db.get(match.awayTeamId),
            ]);
            return {
              matchNumber: match.matchNumber,
              dayKey: match.dayKey,
              round: match.round,
              homeCode: homeTeam?.code,
              awayCode: awayTeam?.code,
            };
          }),
      ),
    };
  },
});
