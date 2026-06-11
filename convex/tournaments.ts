import { query } from "./_generated/server";

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

        return {
          ...tournament,
          days: days.sort((a, b) => a.sortOrder - b.sortOrder),
        };
      }),
    );
  },
});
