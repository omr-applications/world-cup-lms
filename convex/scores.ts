import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { applyMatchResult } from "./results";
import { normalizeFixtureFeed, normalizeScoreFeed } from "./scoreFeed";

type SyncTarget = {
  matchId: Id<"matches">;
  matchNumber: number;
  externalMatchId?: string;
  homeCode?: string;
  awayCode?: string;
  status: "scheduled" | "complete";
  homeScore?: number;
  awayScore?: number;
};

type SyncUpdate = {
  matchId: Id<"matches">;
  homeScore: number;
  awayScore: number;
};

type SyncBatch = {
  groupId: Id<"groups">;
  dayKey: string;
  targets: SyncTarget[];
};

const syncUpdateValidator = v.object({
  matchId: v.id("matches"),
  homeScore: v.number(),
  awayScore: v.number(),
});

const fixtureUpdateValidator = v.object({
  matchNumber: v.optional(v.number()),
  externalMatchId: v.optional(v.string()),
  dayKey: v.string(),
  label: v.string(),
  kickoffAt: v.number(),
  homeCode: v.string(),
  awayCode: v.string(),
  venue: v.string(),
  stage: v.optional(v.string()),
  round: v.optional(v.string()),
});

export const syncGroupDayFromFeed = action({
  args: {
    groupId: v.id("groups"),
    dayKey: v.string(),
  },
  handler: async (ctx, args) => {
    const targets: SyncTarget[] = await ctx.runQuery(internal.scores.getSyncTargets, args);
    const feedResults = await fetchScoreResults(args.dayKey);
    const updates = matchFeedResultsToTargets(feedResults, targets);

    const updated: number = await ctx.runMutation(internal.scores.applySyncedResults, {
      groupId: args.groupId,
      updates,
      resultSource: "fifa-feed",
    });

    return {
      feedResults: feedResults.length,
      matched: updates.length,
      updated,
    };
  },
});

export const syncActiveGroupsFromFeed = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!process.env.FIFA_SCORES_FEED_URL) {
      return { skipped: true, reason: "FIFA_SCORES_FEED_URL is not configured." };
    }

    const batches: SyncBatch[] = await ctx.runQuery(internal.scores.getActiveSyncBatches, {
      now: Date.now(),
    });
    const resultsByDay = new Map<string, Awaited<ReturnType<typeof fetchScoreResults>>>();
    let matched = 0;
    let updated = 0;

    for (const batch of batches) {
      const feedResults = resultsByDay.get(batch.dayKey) ?? await fetchScoreResults(batch.dayKey);
      resultsByDay.set(batch.dayKey, feedResults);
      const updates = matchFeedResultsToTargets(feedResults, batch.targets);
      matched += updates.length;
      updated += await ctx.runMutation(internal.scores.applySyncedResults, {
        groupId: batch.groupId,
        updates,
        resultSource: "fifa-feed-cron",
      });
    }

    return {
      batches: batches.length,
      daysFetched: resultsByDay.size,
      matched,
      updated,
    };
  },
});

export const syncFixturesFromFeed = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<
    | { skipped: true; reason: string }
    | { inserted: number; updated: number; skipped: number; received: number }
  > => {
    const sourceUrl = process.env.FIFA_FIXTURES_FEED_URL;
    if (!sourceUrl) {
      return { skipped: true, reason: "FIFA_FIXTURES_FEED_URL is not configured." };
    }

    const response = await fetch(sourceUrl, { headers: { accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`FIFA fixtures feed returned ${response.status}.`);
    }

    const payload: unknown = await response.json();
    const fixtures = normalizeFixtureFeed(payload);
    const result: { inserted: number; updated: number; skipped: number; received: number } = await ctx.runMutation(internal.scores.upsertFixturesFromFeed, {
      tournamentSlug: "world-cup-2026",
      fixtures,
    });
    return result;
  },
});

export const getSyncTargets = internalQuery({
  args: {
    groupId: v.id("groups"),
    dayKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_group_user", (q) => q.eq("groupId", args.groupId).eq("userId", userId))
      .unique();
    if (!membership || membership.role !== "host") {
      throw new Error("Only the group host can sync scores.");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found.");
    }

    return await collectTargetsForGroupDay(ctx, group.tournamentId, args.dayKey);
  },
});

export const getActiveSyncBatches = internalQuery({
  args: {
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const groups = (await ctx.db.query("groups").collect()).filter((group) => group.status === "active");
    const batches: SyncBatch[] = [];

    for (const group of groups) {
      const days = await ctx.db
        .query("tournamentDays")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", group.tournamentId))
        .collect();
      const groupStartDay = days.find((day) => day.dayKey === group.startDayKey);
      const playableDays = days
        .filter((day) => !groupStartDay || day.sortOrder >= groupStartDay.sortOrder)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      for (const day of playableDays) {
        const dayMatches = await ctx.db
          .query("matches")
          .withIndex("by_tournament_day", (q) =>
            q.eq("tournamentId", group.tournamentId).eq("dayKey", day.dayKey),
          )
          .collect();
        if (
          dayMatches.length === 0 ||
          dayMatches.every((match) => match.status === "complete") ||
          dayMatches.every((match) => match.kickoffAt > args.now)
        ) {
          continue;
        }

        batches.push({
          groupId: group._id,
          dayKey: day.dayKey,
          targets: await collectTargetsForGroupDay(ctx, group.tournamentId, day.dayKey),
        });
      }
    }

    return batches;
  },
});

export const applySyncedResults = internalMutation({
  args: {
    groupId: v.id("groups"),
    updates: v.array(syncUpdateValidator),
    resultSource: v.string(),
  },
  handler: async (ctx, args) => {
    let updated = 0;

    for (const update of args.updates) {
      await applyMatchResult(ctx, {
        groupId: args.groupId,
        matchId: update.matchId,
        homeScore: update.homeScore,
        awayScore: update.awayScore,
        resultSource: args.resultSource,
      });
      updated += 1;
    }

    return updated;
  },
});

export const upsertFixturesFromFeed = internalMutation({
  args: {
    tournamentSlug: v.string(),
    fixtures: v.array(fixtureUpdateValidator),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db
      .query("tournaments")
      .withIndex("by_slug", (q) => q.eq("slug", args.tournamentSlug))
      .unique();
    if (!tournament) {
      throw new Error(`Tournament ${args.tournamentSlug} is not seeded.`);
    }

    const existingMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
      .collect();
    let nextMatchNumber =
      existingMatches.reduce((max, match) => Math.max(max, match.matchNumber), 0) + 1;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const fixture of args.fixtures) {
      const homeTeam = await teamByCode(ctx, tournament._id, fixture.homeCode);
      const awayTeam = await teamByCode(ctx, tournament._id, fixture.awayCode);
      if (!homeTeam || !awayTeam) {
        skipped += 1;
        continue;
      }

      await upsertTournamentDay(ctx, tournament._id, fixture);
      const existing = await findExistingMatch(ctx, tournament._id, fixture, homeTeam._id, awayTeam._id);
      const matchNumber = fixture.matchNumber ?? existing?.matchNumber ?? nextMatchNumber++;
      const patch = {
        dayKey: fixture.dayKey,
        matchNumber,
        externalMatchId: fixture.externalMatchId,
        stage: fixture.stage,
        round: fixture.round,
        kickoffAt: fixture.kickoffAt,
        homeTeamId: homeTeam._id,
        awayTeamId: awayTeam._id,
        venue: fixture.venue,
      };

      if (existing) {
        await ctx.db.patch(existing._id, patch);
        updated += 1;
      } else {
        await ctx.db.insert("matches", {
          tournamentId: tournament._id,
          ...patch,
          status: "scheduled",
        });
        inserted += 1;
      }
    }

    return { inserted, updated, skipped, received: args.fixtures.length };
  },
});

async function fetchScoreResults(dayKey: string) {
  const sourceUrlTemplate = process.env.FIFA_SCORES_FEED_URL;
  if (!sourceUrlTemplate) {
    throw new Error("No FIFA score feed configured yet. Set FIFA_SCORES_FEED_URL in Convex env.");
  }

  const sourceUrl = sourceUrlTemplate.replaceAll("{dayKey}", encodeURIComponent(dayKey));
  const response = await fetch(sourceUrl, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`FIFA score feed returned ${response.status}.`);
  }

  const payload: unknown = await response.json();
  return normalizeScoreFeed(payload);
}

async function collectTargetsForGroupDay(
  ctx: QueryCtx,
  tournamentId: Id<"tournaments">,
  dayKey: string,
) {
  const matches = await ctx.db
    .query("matches")
    .withIndex("by_tournament_day", (q) =>
      q.eq("tournamentId", tournamentId).eq("dayKey", dayKey),
    )
    .collect();

  return await Promise.all(
    matches.map(async (match) => {
      const [homeTeam, awayTeam] = await Promise.all([
        ctx.db.get(match.homeTeamId),
        ctx.db.get(match.awayTeamId),
      ]);

      return {
        matchId: match._id,
        matchNumber: match.matchNumber,
        externalMatchId: match.externalMatchId,
        homeCode: homeTeam?.code,
        awayCode: awayTeam?.code,
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      };
    }),
  );
}

async function teamByCode(ctx: MutationCtx, tournamentId: Id<"tournaments">, code: string) {
  return await ctx.db
    .query("teams")
    .withIndex("by_tournament_code", (q) => q.eq("tournamentId", tournamentId).eq("code", code))
    .unique();
}

async function upsertTournamentDay(
  ctx: MutationCtx,
  tournamentId: Id<"tournaments">,
  fixture: {
    dayKey: string;
    label: string;
    kickoffAt: number;
  },
) {
  const existingDay = await ctx.db
    .query("tournamentDays")
    .withIndex("by_tournament_day", (q) => q.eq("tournamentId", tournamentId).eq("dayKey", fixture.dayKey))
    .unique();
  const dayPatch = {
    label: fixture.label,
    sortOrder: Number(fixture.dayKey.replaceAll("-", "")),
    firstKickoffAt: fixture.kickoffAt,
  };

  if (existingDay) {
    await ctx.db.patch(existingDay._id, {
      ...dayPatch,
      firstKickoffAt: Math.min(existingDay.firstKickoffAt, fixture.kickoffAt),
    });
    return;
  }

  await ctx.db.insert("tournamentDays", {
    tournamentId,
    dayKey: fixture.dayKey,
    ...dayPatch,
  });
}

async function findExistingMatch(
  ctx: MutationCtx,
  tournamentId: Id<"tournaments">,
  fixture: {
    dayKey: string;
    externalMatchId?: string;
  },
  homeTeamId: Id<"teams">,
  awayTeamId: Id<"teams">,
) {
  if (fixture.externalMatchId) {
    const byExternalId = await ctx.db
      .query("matches")
      .withIndex("by_tournament_external_match", (q) =>
        q.eq("tournamentId", tournamentId).eq("externalMatchId", fixture.externalMatchId),
      )
      .unique();
    if (byExternalId) {
      return byExternalId;
    }
  }

  return (
    await ctx.db
      .query("matches")
      .withIndex("by_tournament_day", (q) =>
        q.eq("tournamentId", tournamentId).eq("dayKey", fixture.dayKey),
      )
      .collect()
  ).find((match) => match.homeTeamId === homeTeamId && match.awayTeamId === awayTeamId);
}

function matchFeedResultsToTargets(
  results: ReturnType<typeof normalizeScoreFeed>,
  targets: SyncTarget[],
): SyncUpdate[] {
  const byExternalId = new Map<string, SyncTarget>();
  for (const target of targets) {
    if (target.externalMatchId) {
      byExternalId.set(target.externalMatchId, target);
    }
  }
  const byMatchNumber = new Map(targets.map((target) => [target.matchNumber, target]));
  const byTeams = new Map(
    targets
      .filter((target) => target.homeCode && target.awayCode)
      .map((target) => [`${target.homeCode}:${target.awayCode}`, target]),
  );

  const seen = new Set<Id<"matches">>();
  const updates: SyncUpdate[] = [];

  for (const result of results) {
    const target =
      (result.externalMatchId ? byExternalId.get(result.externalMatchId) : undefined) ??
      (result.matchNumber ? byMatchNumber.get(result.matchNumber) : undefined) ??
      (result.homeCode && result.awayCode ? byTeams.get(`${result.homeCode}:${result.awayCode}`) : undefined);

    if (!target || seen.has(target.matchId)) {
      continue;
    }
    if (
      target.status === "complete" &&
      target.homeScore === result.homeScore &&
      target.awayScore === result.awayScore
    ) {
      continue;
    }

    seen.add(target.matchId);
    updates.push({
      matchId: target.matchId,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
    });
  }

  return updates;
}
