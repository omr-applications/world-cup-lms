import { query } from "./_generated/server";
import { dayWindow, mergePickWindows, roundWindowForMatch } from "./pickWindows";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const tournaments = await ctx.db.query("tournaments").collect();

    return await Promise.all(
      tournaments.map(async (tournament) => {
        const days = await ctx.db
          .query("tournamentDays")
          .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
          .collect();
        const sortedDays = days.sort((a, b) => a.sortOrder - b.sortOrder);
        const daysByKey = new Map(sortedDays.map((day) => [day.dayKey, day]));
        const matches = await ctx.db
          .query("matches")
          .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
          .collect();

        return {
          ...tournament,
          days: sortedDays,
          dayWindows: sortedDays.map(dayWindow),
          roundWindows: mergePickWindows(matches.map((match) => roundWindowForMatch(match, daysByKey.get(match.dayKey)))),
        };
      }),
    );
  },
});
