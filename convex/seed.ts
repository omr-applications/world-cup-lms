import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";

const tournamentSlug = "world-cup-2026";

const teams = [
  {
    code: "MEX",
    name: "Mexico",
    group: "A",
    flagCode: "mx",
    fifaRank: 15,
    rankingPoints: 1660.94,
    slug: "mexico",
    primaryColor: "#006847",
    secondaryColor: "#ce1126",
  },
  {
    code: "RSA",
    name: "South Africa",
    group: "A",
    flagCode: "za",
    fifaRank: 56,
    rankingPoints: 1418.77,
    slug: "south-africa",
    primaryColor: "#007a4d",
    secondaryColor: "#ffb81c",
  },
  {
    code: "KOR",
    name: "Korea Republic",
    group: "A",
    flagCode: "kr",
    fifaRank: 25,
    rankingPoints: 1586.72,
    slug: "korea-republic",
    primaryColor: "#c60c30",
    secondaryColor: "#003478",
  },
  {
    code: "CZE",
    name: "Czechia",
    group: "A",
    flagCode: "cz",
    fifaRank: 38,
    rankingPoints: 1493.99,
    slug: "czechia",
    primaryColor: "#11457e",
    secondaryColor: "#d7141a",
  },
  {
    code: "USA",
    name: "United States",
    group: "D",
    flagCode: "us",
    fifaRank: 16,
    rankingPoints: 1652.76,
    slug: "united-states",
    primaryColor: "#3c3b6e",
    secondaryColor: "#b22234",
  },
  {
    code: "PAR",
    name: "Paraguay",
    group: "D",
    flagCode: "py",
    fifaRank: 48,
    rankingPoints: 1451.12,
    slug: "paraguay",
    primaryColor: "#0038a8",
    secondaryColor: "#d52b1e",
  },
  {
    code: "CAN",
    name: "Canada",
    group: "B",
    flagCode: "ca",
    fifaRank: 30,
    rankingPoints: 1530.44,
    slug: "canada",
    primaryColor: "#d80621",
    secondaryColor: "#ffffff",
  },
  {
    code: "BIH",
    name: "Bosnia and Herzegovina",
    group: "B",
    flagCode: "ba",
    fifaRank: 72,
    rankingPoints: 1342.54,
    slug: "bosnia-and-herzegovina",
    primaryColor: "#002395",
    secondaryColor: "#fecb00",
  },
  {
    code: "AUS",
    name: "Australia",
    group: "D",
    flagCode: "au",
    fifaRank: 24,
    rankingPoints: 1588.93,
    slug: "australia",
    primaryColor: "#ffcd00",
    secondaryColor: "#00843d",
  },
  {
    code: "TUR",
    name: "Turkey",
    group: "D",
    flagCode: "tr",
    fifaRank: 26,
    rankingPoints: 1579.48,
    slug: "turkey",
    primaryColor: "#e30a17",
    secondaryColor: "#ffffff",
  },
  {
    code: "SWE",
    name: "Sweden",
    group: "F",
    flagCode: "se",
    fifaRank: 32,
    rankingPoints: 1525.14,
    slug: "sweden",
    primaryColor: "#006aa7",
    secondaryColor: "#fecc00",
  },
  {
    code: "TUN",
    name: "Tunisia",
    group: "F",
    flagCode: "tn",
    fifaRank: 46,
    rankingPoints: 1462.11,
    slug: "tunisia",
    primaryColor: "#e70013",
    secondaryColor: "#ffffff",
  },
  {
    code: "ENG",
    name: "England",
    group: "L",
    flagCode: "gb-eng",
    fifaRank: 4,
    rankingPoints: 1825.97,
    slug: "england",
    primaryColor: "#ffffff",
    secondaryColor: "#cf142b",
  },
  {
    code: "CRO",
    name: "Croatia",
    group: "L",
    flagCode: "hr",
    fifaRank: 11,
    rankingPoints: 1701.36,
    slug: "croatia",
    primaryColor: "#f00000",
    secondaryColor: "#171796",
  },
  {
    code: "ARG",
    name: "Argentina",
    group: "J",
    flagCode: "ar",
    fifaRank: 3,
    rankingPoints: 1874.81,
    slug: "argentina",
    primaryColor: "#75aadb",
    secondaryColor: "#f6b40e",
  },
  {
    code: "AUT",
    name: "Austria",
    group: "J",
    flagCode: "at",
    fifaRank: 23,
    rankingPoints: 1594.42,
    slug: "austria",
    primaryColor: "#ed2939",
    secondaryColor: "#ffffff",
  },
] as const;

const fixtures = [
  {
    dayKey: "2026-06-11",
    label: "Thursday, June 11",
    stage: "Group stage",
    round: "Group Round 1",
    matches: [
      ["MEX", "RSA", "Mexico City", "2026-06-11T20:00:00.000Z"],
      ["KOR", "CZE", "Toronto", "2026-06-11T23:00:00.000Z"],
    ],
  },
  {
    dayKey: "2026-06-12",
    label: "Friday, June 12",
    stage: "Group stage",
    round: "Group Round 1",
    matches: [
      ["USA", "PAR", "Los Angeles", "2026-06-12T22:00:00.000Z"],
      ["CAN", "BIH", "Vancouver", "2026-06-13T01:00:00.000Z"],
    ],
  },
  {
    dayKey: "2026-06-13",
    label: "Saturday, June 13",
    stage: "Group stage",
    round: "Group Round 1",
    matches: [
      ["AUS", "TUR", "Houston", "2026-06-13T19:00:00.000Z"],
      ["SWE", "TUN", "Boston", "2026-06-13T22:00:00.000Z"],
    ],
  },
  {
    dayKey: "2026-06-17",
    label: "Wednesday, June 17",
    stage: "Group stage",
    round: "Group Round 2",
    matches: [
      ["ENG", "CRO", "Dallas", "2026-06-17T20:00:00.000Z"],
      ["ARG", "AUT", "Kansas City", "2026-06-17T23:00:00.000Z"],
    ],
  },
] as const;

export const worldCup2026 = mutation({
  args: {
    resetResults: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existingTournament = await ctx.db
      .query("tournaments")
      .withIndex("by_slug", (q) => q.eq("slug", tournamentSlug))
      .unique();

    const now = Date.now();
    const tournamentId =
      existingTournament?._id ??
      (await ctx.db.insert("tournaments", {
        slug: tournamentSlug,
        name: "FIFA World Cup 2026",
        year: 2026,
        status: "active",
        createdAt: now,
      }));

    const teamIds = new Map<string, Id<"teams">>();
    for (const team of teams) {
      const existing = await ctx.db
        .query("teams")
        .withIndex("by_tournament_code", (q) => q.eq("tournamentId", tournamentId).eq("code", team.code))
        .unique();
      const fifaTeamUrl = `https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams/${team.slug}`;
      const metadata = {
        tournamentId,
        code: team.code,
        name: team.name,
        group: team.group,
        flagUrl: `https://flagcdn.com/w80/${team.flagCode}.png`,
        fifaRank: team.fifaRank,
        rankingPoints: team.rankingPoints,
        fifaTeamUrl,
        squadUrl: `${fifaTeamUrl}/squad`,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
      };

      const teamId =
        existing?._id ??
        (await ctx.db.insert("teams", metadata));
      if (existing) {
        await ctx.db.patch(existing._id, metadata);
      }
      teamIds.set(team.code, teamId);
    }

    let matchNumber = 1;
    for (const fixtureDay of fixtures) {
      const firstKickoffAt = Math.min(
        ...fixtureDay.matches.map((match) => Date.parse(match[3])),
      );
      const existingDay = await ctx.db
        .query("tournamentDays")
        .withIndex("by_tournament_day", (q) =>
          q.eq("tournamentId", tournamentId).eq("dayKey", fixtureDay.dayKey),
        )
        .unique();

      if (!existingDay) {
        await ctx.db.insert("tournamentDays", {
          tournamentId,
          dayKey: fixtureDay.dayKey,
          label: fixtureDay.label,
          sortOrder: Number(fixtureDay.dayKey.replaceAll("-", "")),
          firstKickoffAt,
        });
      }

      for (const [homeCode, awayCode, venue, kickoff] of fixtureDay.matches) {
        const homeTeamId = teamIds.get(homeCode);
        const awayTeamId = teamIds.get(awayCode);
        if (!homeTeamId || !awayTeamId) {
          throw new Error(`Missing team for fixture ${homeCode} vs ${awayCode}`);
        }

        const kickoffAt = Date.parse(kickoff);
        const existingMatch = (
          await ctx.db
            .query("matches")
            .withIndex("by_tournament_day", (q) =>
              q.eq("tournamentId", tournamentId).eq("dayKey", fixtureDay.dayKey),
            )
            .collect()
        ).find((match) => match.homeTeamId === homeTeamId && match.awayTeamId === awayTeamId);

        const externalMatchId = String(matchNumber);
        if (existingMatch) {
          if (args.resetResults) {
            await ctx.db.patch(existingMatch._id, {
              matchNumber,
              externalMatchId,
              stage: fixtureDay.stage,
              round: fixtureDay.round,
              kickoffAt,
              venue,
              status: "scheduled",
              homeScore: undefined,
              awayScore: undefined,
              winnerTeamId: undefined,
              resultSource: undefined,
              resultSyncedAt: undefined,
            });
          } else {
            await ctx.db.patch(existingMatch._id, {
              matchNumber,
              externalMatchId,
              stage: fixtureDay.stage,
              round: fixtureDay.round,
              kickoffAt,
              venue,
            });
          }
          matchNumber += 1;
          continue;
        }

        await ctx.db.insert("matches", {
          tournamentId,
          dayKey: fixtureDay.dayKey,
          matchNumber,
          externalMatchId,
          stage: fixtureDay.stage,
          round: fixtureDay.round,
          kickoffAt,
          homeTeamId,
          awayTeamId,
          venue,
          status: "scheduled",
        });
        matchNumber += 1;
      }
    }

    return { tournamentId };
  },
});
