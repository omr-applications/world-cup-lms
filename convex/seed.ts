import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";

const tournamentSlug = "world-cup-2026";

type SeedTeam = {
  code: string;
  name: string;
  group: string;
  flagCode: string;
  fifaRank: number;
  rankingPoints?: number;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
};

type FixtureDay = {
  dayKey: string;
  label: string;
  stage: string;
  round: "Group Round 1" | "Group Round 2" | "Group Round 3";
  matches: Array<[homeCode: string, awayCode: string, venue: string, kickoff: string]>;
};

const teams: SeedTeam[] = [
  { code: "MEX", name: "Mexico", group: "A", flagCode: "mx", fifaRank: 14, rankingPoints: 1687.48, slug: "mexico", primaryColor: "#006847", secondaryColor: "#ce1126" },
  { code: "RSA", name: "South Africa", group: "A", flagCode: "za", fifaRank: 60, slug: "south-africa", primaryColor: "#007a4d", secondaryColor: "#ffb81c" },
  { code: "KOR", name: "Korea Republic", group: "A", flagCode: "kr", fifaRank: 25, rankingPoints: 1591.63, slug: "korea-republic", primaryColor: "#c60c30", secondaryColor: "#003478" },
  { code: "CZE", name: "Czechia", group: "A", flagCode: "cz", fifaRank: 40, rankingPoints: 1505.74, slug: "czechia", primaryColor: "#11457e", secondaryColor: "#d7141a" },
  { code: "CAN", name: "Canada", group: "B", flagCode: "ca", fifaRank: 30, rankingPoints: 1559.48, slug: "canada", primaryColor: "#d80621", secondaryColor: "#ffffff" },
  { code: "BIH", name: "Bosnia and Herzegovina", group: "B", flagCode: "ba", fifaRank: 64, slug: "bosnia-and-herzegovina", primaryColor: "#002395", secondaryColor: "#fecb00" },
  { code: "QAT", name: "Qatar", group: "B", flagCode: "qa", fifaRank: 56, slug: "qatar", primaryColor: "#8d1b3d", secondaryColor: "#ffffff" },
  { code: "SUI", name: "Switzerland", group: "B", flagCode: "ch", fifaRank: 19, rankingPoints: 1650.06, slug: "switzerland", primaryColor: "#d52b1e", secondaryColor: "#ffffff" },
  { code: "BRA", name: "Brazil", group: "C", flagCode: "br", fifaRank: 6, rankingPoints: 1765.86, slug: "brazil", primaryColor: "#009b3a", secondaryColor: "#ffdf00" },
  { code: "MAR", name: "Morocco", group: "C", flagCode: "ma", fifaRank: 7, rankingPoints: 1755.1, slug: "morocco", primaryColor: "#c1272d", secondaryColor: "#006233" },
  { code: "HAI", name: "Haiti", group: "C", flagCode: "ht", fifaRank: 83, slug: "haiti", primaryColor: "#00209f", secondaryColor: "#d21034" },
  { code: "SCO", name: "Scotland", group: "C", flagCode: "gb-sct", fifaRank: 42, rankingPoints: 1503.34, slug: "scotland", primaryColor: "#005eb8", secondaryColor: "#ffffff" },
  { code: "USA", name: "United States", group: "D", flagCode: "us", fifaRank: 17, rankingPoints: 1671.23, slug: "united-states", primaryColor: "#3c3b6e", secondaryColor: "#b22234" },
  { code: "PAR", name: "Paraguay", group: "D", flagCode: "py", fifaRank: 41, rankingPoints: 1505.35, slug: "paraguay", primaryColor: "#0038a8", secondaryColor: "#d52b1e" },
  { code: "AUS", name: "Australia", group: "D", flagCode: "au", fifaRank: 27, rankingPoints: 1579.34, slug: "australia", primaryColor: "#ffcd00", secondaryColor: "#00843d" },
  { code: "TUR", name: "Türkiye", group: "D", flagCode: "tr", fifaRank: 22, rankingPoints: 1605.73, slug: "turkiye", primaryColor: "#e30a17", secondaryColor: "#ffffff" },
  { code: "GER", name: "Germany", group: "E", flagCode: "de", fifaRank: 10, rankingPoints: 1735.77, slug: "germany", primaryColor: "#000000", secondaryColor: "#dd0000" },
  { code: "CUW", name: "Curacao", group: "E", flagCode: "cw", fifaRank: 82, slug: "curacao", primaryColor: "#002b7f", secondaryColor: "#f9e814" },
  { code: "CIV", name: "Cote d'Ivoire", group: "E", flagCode: "ci", fifaRank: 33, rankingPoints: 1540.87, slug: "cote-divoire", primaryColor: "#f77f00", secondaryColor: "#009e60" },
  { code: "ECU", name: "Ecuador", group: "E", flagCode: "ec", fifaRank: 23, rankingPoints: 1598.52, slug: "ecuador", primaryColor: "#ffdd00", secondaryColor: "#034ea2" },
  { code: "NED", name: "Netherlands", group: "F", flagCode: "nl", fifaRank: 8, rankingPoints: 1753.57, slug: "netherlands", primaryColor: "#ff4f00", secondaryColor: "#21468b" },
  { code: "JPN", name: "Japan", group: "F", flagCode: "jp", fifaRank: 18, rankingPoints: 1661.58, slug: "japan", primaryColor: "#bc002d", secondaryColor: "#ffffff" },
  { code: "SWE", name: "Sweden", group: "F", flagCode: "se", fifaRank: 38, rankingPoints: 1509.79, slug: "sweden", primaryColor: "#006aa7", secondaryColor: "#fecc00" },
  { code: "TUN", name: "Tunisia", group: "F", flagCode: "tn", fifaRank: 45, rankingPoints: 1476.41, slug: "tunisia", primaryColor: "#e70013", secondaryColor: "#ffffff" },
  { code: "BEL", name: "Belgium", group: "G", flagCode: "be", fifaRank: 9, rankingPoints: 1742.24, slug: "belgium", primaryColor: "#000000", secondaryColor: "#fae042" },
  { code: "EGY", name: "Egypt", group: "G", flagCode: "eg", fifaRank: 29, rankingPoints: 1562.37, slug: "egypt", primaryColor: "#ce1126", secondaryColor: "#000000" },
  { code: "IRN", name: "Iran", group: "G", flagCode: "ir", fifaRank: 20, rankingPoints: 1619.58, slug: "iran", primaryColor: "#239f40", secondaryColor: "#da0000" },
  { code: "NZL", name: "New Zealand", group: "G", flagCode: "nz", fifaRank: 85, slug: "new-zealand", primaryColor: "#000000", secondaryColor: "#ffffff" },
  { code: "ESP", name: "Spain", group: "H", flagCode: "es", fifaRank: 2, rankingPoints: 1874.71, slug: "spain", primaryColor: "#aa151b", secondaryColor: "#f1bf00" },
  { code: "CPV", name: "Cape Verde", group: "H", flagCode: "cv", fifaRank: 67, slug: "cape-verde", primaryColor: "#003893", secondaryColor: "#cf2027" },
  { code: "KSA", name: "Saudi Arabia", group: "H", flagCode: "sa", fifaRank: 61, slug: "saudi-arabia", primaryColor: "#006c35", secondaryColor: "#ffffff" },
  { code: "URU", name: "Uruguay", group: "H", flagCode: "uy", fifaRank: 16, rankingPoints: 1673.07, slug: "uruguay", primaryColor: "#5bc2e7", secondaryColor: "#fcd116" },
  { code: "FRA", name: "France", group: "I", flagCode: "fr", fifaRank: 3, rankingPoints: 1870.7, slug: "france", primaryColor: "#0055a4", secondaryColor: "#ef4135" },
  { code: "SEN", name: "Senegal", group: "I", flagCode: "sn", fifaRank: 15, rankingPoints: 1684.07, slug: "senegal", primaryColor: "#00853f", secondaryColor: "#fdef42" },
  { code: "IRQ", name: "Iraq", group: "I", flagCode: "iq", fifaRank: 57, slug: "iraq", primaryColor: "#ce1126", secondaryColor: "#007a3d" },
  { code: "NOR", name: "Norway", group: "I", flagCode: "no", fifaRank: 31, rankingPoints: 1557.44, slug: "norway", primaryColor: "#ba0c2f", secondaryColor: "#00205b" },
  { code: "ARG", name: "Argentina", group: "J", flagCode: "ar", fifaRank: 1, rankingPoints: 1877.27, slug: "argentina", primaryColor: "#75aadb", secondaryColor: "#f6b40e" },
  { code: "ALG", name: "Algeria", group: "J", flagCode: "dz", fifaRank: 28, rankingPoints: 1571.03, slug: "algeria", primaryColor: "#006233", secondaryColor: "#d21034" },
  { code: "AUT", name: "Austria", group: "J", flagCode: "at", fifaRank: 24, rankingPoints: 1597.4, slug: "austria", primaryColor: "#ed2939", secondaryColor: "#ffffff" },
  { code: "JOR", name: "Jordan", group: "J", flagCode: "jo", fifaRank: 63, slug: "jordan", primaryColor: "#007a3d", secondaryColor: "#ce1126" },
  { code: "POR", name: "Portugal", group: "K", flagCode: "pt", fifaRank: 5, rankingPoints: 1767.85, slug: "portugal", primaryColor: "#006600", secondaryColor: "#ff0000" },
  { code: "COD", name: "DR Congo", group: "K", flagCode: "cd", fifaRank: 46, rankingPoints: 1474.43, slug: "dr-congo", primaryColor: "#00a3e0", secondaryColor: "#ce1021" },
  { code: "UZB", name: "Uzbekistan", group: "K", flagCode: "uz", fifaRank: 50, rankingPoints: 1458.73, slug: "uzbekistan", primaryColor: "#0099b5", secondaryColor: "#1eb53a" },
  { code: "COL", name: "Colombia", group: "K", flagCode: "co", fifaRank: 13, rankingPoints: 1698.35, slug: "colombia", primaryColor: "#fcd116", secondaryColor: "#003893" },
  { code: "ENG", name: "England", group: "L", flagCode: "gb-eng", fifaRank: 4, rankingPoints: 1828.02, slug: "england", primaryColor: "#ffffff", secondaryColor: "#cf142b" },
  { code: "CRO", name: "Croatia", group: "L", flagCode: "hr", fifaRank: 11, rankingPoints: 1714.87, slug: "croatia", primaryColor: "#f00000", secondaryColor: "#171796" },
  { code: "GHA", name: "Ghana", group: "L", flagCode: "gh", fifaRank: 73, slug: "ghana", primaryColor: "#ce1126", secondaryColor: "#fcd116" },
  { code: "PAN", name: "Panama", group: "L", flagCode: "pa", fifaRank: 34, rankingPoints: 1539.16, slug: "panama", primaryColor: "#005293", secondaryColor: "#d21034" },
];

const fixtures: FixtureDay[] = [
  { dayKey: "2026-06-11", label: "Thursday, June 11", stage: "Group stage", round: "Group Round 1", matches: [
    ["MEX", "RSA", "Mexico City", "2026-06-11T19:00:00.000Z"],
    ["KOR", "CZE", "Zapopan", "2026-06-12T02:00:00.000Z"],
  ] },
  { dayKey: "2026-06-12", label: "Friday, June 12", stage: "Group stage", round: "Group Round 1", matches: [
    ["CAN", "BIH", "Toronto", "2026-06-12T19:00:00.000Z"],
    ["USA", "PAR", "Inglewood", "2026-06-13T01:00:00.000Z"],
  ] },
  { dayKey: "2026-06-13", label: "Saturday, June 13", stage: "Group stage", round: "Group Round 1", matches: [
    ["QAT", "SUI", "Santa Clara", "2026-06-13T19:00:00.000Z"],
    ["BRA", "MAR", "East Rutherford", "2026-06-13T22:00:00.000Z"],
    ["HAI", "SCO", "Foxborough", "2026-06-14T01:00:00.000Z"],
    ["AUS", "TUR", "Vancouver", "2026-06-14T04:00:00.000Z"],
  ] },
  { dayKey: "2026-06-14", label: "Sunday, June 14", stage: "Group stage", round: "Group Round 1", matches: [
    ["GER", "CUW", "Houston", "2026-06-14T17:00:00.000Z"],
    ["NED", "JPN", "Arlington", "2026-06-14T20:00:00.000Z"],
    ["CIV", "ECU", "Philadelphia", "2026-06-14T23:00:00.000Z"],
    ["SWE", "TUN", "Guadalupe", "2026-06-15T02:00:00.000Z"],
  ] },
  { dayKey: "2026-06-15", label: "Monday, June 15", stage: "Group stage", round: "Group Round 1", matches: [
    ["ESP", "CPV", "Atlanta", "2026-06-15T17:00:00.000Z"],
    ["BEL", "EGY", "Seattle", "2026-06-15T22:00:00.000Z"],
    ["KSA", "URU", "Miami Gardens", "2026-06-15T22:00:00.000Z"],
    ["IRN", "NZL", "Inglewood", "2026-06-16T04:00:00.000Z"],
  ] },
  { dayKey: "2026-06-16", label: "Tuesday, June 16", stage: "Group stage", round: "Group Round 1", matches: [
    ["FRA", "SEN", "East Rutherford", "2026-06-16T19:00:00.000Z"],
    ["IRQ", "NOR", "Foxborough", "2026-06-16T22:00:00.000Z"],
    ["ARG", "ALG", "Kansas City", "2026-06-17T01:00:00.000Z"],
    ["AUT", "JOR", "Santa Clara", "2026-06-17T04:00:00.000Z"],
  ] },
  { dayKey: "2026-06-17", label: "Wednesday, June 17", stage: "Group stage", round: "Group Round 1", matches: [
    ["POR", "COD", "Houston", "2026-06-17T17:00:00.000Z"],
    ["ENG", "CRO", "Arlington", "2026-06-17T20:00:00.000Z"],
    ["GHA", "PAN", "Toronto", "2026-06-17T23:00:00.000Z"],
    ["UZB", "COL", "Mexico City", "2026-06-18T02:00:00.000Z"],
  ] },
  { dayKey: "2026-06-18", label: "Thursday, June 18", stage: "Group stage", round: "Group Round 2", matches: [
    ["CZE", "RSA", "Atlanta", "2026-06-18T16:00:00.000Z"],
    ["SUI", "BIH", "Inglewood", "2026-06-18T19:00:00.000Z"],
    ["CAN", "QAT", "Vancouver", "2026-06-18T22:00:00.000Z"],
    ["MEX", "KOR", "Zapopan", "2026-06-19T03:00:00.000Z"],
  ] },
  { dayKey: "2026-06-19", label: "Friday, June 19", stage: "Group stage", round: "Group Round 2", matches: [
    ["USA", "AUS", "Seattle", "2026-06-19T19:00:00.000Z"],
    ["SCO", "MAR", "Foxborough", "2026-06-19T22:00:00.000Z"],
    ["BRA", "HAI", "Philadelphia", "2026-06-20T01:00:00.000Z"],
    ["TUR", "PAR", "Santa Clara", "2026-06-20T04:00:00.000Z"],
  ] },
  { dayKey: "2026-06-20", label: "Saturday, June 20", stage: "Group stage", round: "Group Round 2", matches: [
    ["NED", "SWE", "Houston", "2026-06-20T17:00:00.000Z"],
    ["GER", "CIV", "Toronto", "2026-06-20T20:00:00.000Z"],
    ["ECU", "CUW", "Kansas City", "2026-06-21T00:00:00.000Z"],
    ["TUN", "JPN", "Guadalupe", "2026-06-21T04:00:00.000Z"],
  ] },
  { dayKey: "2026-06-21", label: "Sunday, June 21", stage: "Group stage", round: "Group Round 2", matches: [
    ["ESP", "KSA", "Atlanta", "2026-06-21T16:00:00.000Z"],
    ["BEL", "IRN", "Inglewood", "2026-06-21T19:00:00.000Z"],
    ["URU", "CPV", "Miami Gardens", "2026-06-21T22:00:00.000Z"],
    ["NZL", "EGY", "Vancouver", "2026-06-22T01:00:00.000Z"],
  ] },
  { dayKey: "2026-06-22", label: "Monday, June 22", stage: "Group stage", round: "Group Round 2", matches: [
    ["ARG", "AUT", "Arlington", "2026-06-22T17:00:00.000Z"],
    ["FRA", "IRQ", "Philadelphia", "2026-06-22T21:00:00.000Z"],
    ["NOR", "SEN", "East Rutherford", "2026-06-23T00:00:00.000Z"],
    ["JOR", "ALG", "Santa Clara", "2026-06-23T03:00:00.000Z"],
  ] },
  { dayKey: "2026-06-23", label: "Tuesday, June 23", stage: "Group stage", round: "Group Round 2", matches: [
    ["POR", "UZB", "Houston", "2026-06-23T17:00:00.000Z"],
    ["ENG", "GHA", "Foxborough", "2026-06-23T20:00:00.000Z"],
    ["PAN", "CRO", "Toronto", "2026-06-23T23:00:00.000Z"],
    ["COL", "COD", "Zapopan", "2026-06-24T02:00:00.000Z"],
  ] },
  { dayKey: "2026-06-24", label: "Wednesday, June 24", stage: "Group stage", round: "Group Round 3", matches: [
    ["SUI", "CAN", "Vancouver", "2026-06-24T19:00:00.000Z"],
    ["BIH", "QAT", "Seattle", "2026-06-24T19:00:00.000Z"],
    ["SCO", "BRA", "Miami Gardens", "2026-06-24T22:00:00.000Z"],
    ["MAR", "HAI", "Atlanta", "2026-06-24T22:00:00.000Z"],
    ["CZE", "MEX", "Mexico City", "2026-06-25T01:00:00.000Z"],
    ["RSA", "KOR", "Guadalupe", "2026-06-25T01:00:00.000Z"],
  ] },
  { dayKey: "2026-06-25", label: "Thursday, June 25", stage: "Group stage", round: "Group Round 3", matches: [
    ["ECU", "GER", "East Rutherford", "2026-06-25T20:00:00.000Z"],
    ["CUW", "CIV", "Philadelphia", "2026-06-25T20:00:00.000Z"],
    ["JPN", "SWE", "Arlington", "2026-06-25T23:00:00.000Z"],
    ["TUN", "NED", "Kansas City", "2026-06-25T23:00:00.000Z"],
    ["TUR", "USA", "Inglewood", "2026-06-26T02:00:00.000Z"],
    ["PAR", "AUS", "Santa Clara", "2026-06-26T02:00:00.000Z"],
  ] },
  { dayKey: "2026-06-26", label: "Friday, June 26", stage: "Group stage", round: "Group Round 3", matches: [
    ["NOR", "FRA", "Foxborough", "2026-06-26T19:00:00.000Z"],
    ["SEN", "IRQ", "Toronto", "2026-06-26T19:00:00.000Z"],
    ["CPV", "KSA", "Houston", "2026-06-27T00:00:00.000Z"],
    ["URU", "ESP", "Zapopan", "2026-06-27T00:00:00.000Z"],
    ["EGY", "IRN", "Seattle", "2026-06-27T03:00:00.000Z"],
    ["NZL", "BEL", "Vancouver", "2026-06-27T03:00:00.000Z"],
  ] },
  { dayKey: "2026-06-27", label: "Saturday, June 27", stage: "Group stage", round: "Group Round 3", matches: [
    ["PAN", "ENG", "East Rutherford", "2026-06-27T21:00:00.000Z"],
    ["CRO", "GHA", "Philadelphia", "2026-06-27T21:00:00.000Z"],
    ["COL", "POR", "Miami Gardens", "2026-06-27T23:30:00.000Z"],
    ["COD", "UZB", "Atlanta", "2026-06-27T23:30:00.000Z"],
    ["ALG", "AUT", "Kansas City", "2026-06-28T02:00:00.000Z"],
    ["JOR", "ARG", "Arlington", "2026-06-28T02:00:00.000Z"],
  ] },
];

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

      const teamId = existing?._id ?? (await ctx.db.insert("teams", metadata));
      if (existing) {
        await ctx.db.patch(existing._id, metadata);
      }
      teamIds.set(team.code, teamId);
    }
    const desiredMatchKeys = new Set<string>();
    for (const fixtureDay of fixtures) {
      for (const [homeCode, awayCode] of fixtureDay.matches) {
        const homeTeamId = teamIds.get(homeCode);
        const awayTeamId = teamIds.get(awayCode);
        if (homeTeamId && awayTeamId) {
          desiredMatchKeys.add(matchKey(homeTeamId, awayTeamId, fixtureDay.dayKey));
        }
      }
    }

    let matchNumber = 1;
    for (const fixtureDay of fixtures) {
      const firstKickoffAt = Math.min(...fixtureDay.matches.map((match) => Date.parse(match[3])));
      const existingDay = await ctx.db
        .query("tournamentDays")
        .withIndex("by_tournament_day", (q) =>
          q.eq("tournamentId", tournamentId).eq("dayKey", fixtureDay.dayKey),
        )
        .unique();

      const dayPatch = {
        label: fixtureDay.label,
        sortOrder: Number(fixtureDay.dayKey.replaceAll("-", "")),
        firstKickoffAt,
      };
      if (existingDay) {
        await ctx.db.patch(existingDay._id, dayPatch);
      } else {
        await ctx.db.insert("tournamentDays", {
          tournamentId,
          dayKey: fixtureDay.dayKey,
          ...dayPatch,
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
            .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
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

    const currentMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect();
    for (const match of currentMatches) {
      const isGroupStageMatch =
        match.stage === "Group stage" || match.round?.startsWith("Group Round") || match.round === undefined;
      if (isGroupStageMatch && !desiredMatchKeys.has(matchKey(match.homeTeamId, match.awayTeamId, match.dayKey))) {
        const picksForMatch = await ctx.db
          .query("picks")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .take(1);
        if (picksForMatch.length > 0) {
          continue;
        }
        await ctx.db.delete(match._id);
      }
    }

    matchNumber = 1;
    for (const fixtureDay of fixtures) {
      for (const [homeCode, awayCode, venue, kickoff] of fixtureDay.matches) {
        const homeTeamId = teamIds.get(homeCode);
        const awayTeamId = teamIds.get(awayCode);
        if (!homeTeamId || !awayTeamId) {
          throw new Error(`Missing team for fixture ${homeCode} vs ${awayCode}`);
        }

        const existingMatch = (
          await ctx.db
            .query("matches")
            .withIndex("by_tournament_day", (q) =>
              q.eq("tournamentId", tournamentId).eq("dayKey", fixtureDay.dayKey),
            )
            .collect()
        ).find((match) => match.homeTeamId === homeTeamId && match.awayTeamId === awayTeamId);

        if (existingMatch) {
          await ctx.db.patch(existingMatch._id, {
            matchNumber,
            externalMatchId: String(matchNumber),
            stage: fixtureDay.stage,
            round: fixtureDay.round,
            kickoffAt: Date.parse(kickoff),
            venue,
          });
        } else {
          await ctx.db.insert("matches", {
            tournamentId,
            dayKey: fixtureDay.dayKey,
            matchNumber,
            externalMatchId: String(matchNumber),
            stage: fixtureDay.stage,
            round: fixtureDay.round,
            kickoffAt: Date.parse(kickoff),
            homeTeamId,
            awayTeamId,
            venue,
            status: "scheduled",
          });
        }
        matchNumber += 1;
      }
    }

    return { tournamentId, teams: teams.length, matches: fixtures.reduce((total, day) => total + day.matches.length, 0) };
  },
});

function matchKey(homeTeamId: Id<"teams">, awayTeamId: Id<"teams">, dayKey: string) {
  return `${homeTeamId}:${awayTeamId}:${dayKey}`;
}
