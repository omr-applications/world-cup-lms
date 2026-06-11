import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  profiles: defineTable({
    userId: v.id("users"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    displayName: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  tournaments: defineTable({
    slug: v.string(),
    name: v.string(),
    year: v.number(),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("complete")),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),
  teams: defineTable({
    tournamentId: v.id("tournaments"),
    code: v.string(),
    name: v.string(),
    group: v.optional(v.string()),
    flagUrl: v.optional(v.string()),
    fifaRank: v.optional(v.number()),
    rankingPoints: v.optional(v.number()),
    fifaTeamUrl: v.optional(v.string()),
    squadUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_code", ["tournamentId", "code"]),
  tournamentDays: defineTable({
    tournamentId: v.id("tournaments"),
    dayKey: v.string(),
    label: v.string(),
    sortOrder: v.number(),
    firstKickoffAt: v.number(),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_day", ["tournamentId", "dayKey"]),
  matches: defineTable({
    tournamentId: v.id("tournaments"),
    dayKey: v.string(),
    matchNumber: v.number(),
    externalMatchId: v.optional(v.string()),
    stage: v.optional(v.string()),
    round: v.optional(v.string()),
    kickoffAt: v.number(),
    homeTeamId: v.id("teams"),
    awayTeamId: v.id("teams"),
    venue: v.string(),
    status: v.union(v.literal("scheduled"), v.literal("complete")),
    homeScore: v.optional(v.number()),
    awayScore: v.optional(v.number()),
    winnerTeamId: v.optional(v.id("teams")),
    resultSource: v.optional(v.string()),
    resultSyncedAt: v.optional(v.number()),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_day", ["tournamentId", "dayKey"])
    .index("by_day_kickoff", ["dayKey", "kickoffAt"])
    .index("by_tournament_external_match", ["tournamentId", "externalMatchId"]),
  groups: defineTable({
    name: v.string(),
    code: v.string(),
    hostUserId: v.id("users"),
    tournamentId: v.id("tournaments"),
    scheduleMode: v.optional(v.union(v.literal("day"), v.literal("round"))),
    startDayKey: v.string(),
    startPickWindowKey: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("complete")),
    winnerMembershipId: v.optional(v.id("memberships")),
    selectionResetAt: v.optional(v.number()),
    selectionResetRequestedAt: v.optional(v.number()),
    selectionResetRequestedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_host", ["hostUserId"])
    .index("by_tournament", ["tournamentId"]),
  memberships: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    role: v.union(v.literal("host"), v.literal("player")),
    status: v.union(v.literal("active"), v.literal("eliminated"), v.literal("winner")),
    joinedAt: v.number(),
    eliminatedAt: v.optional(v.number()),
    eliminatedReason: v.optional(
      v.union(v.literal("lost"), v.literal("no_pick"), v.literal("late_join")),
    ),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_user", ["groupId", "userId"]),
  picks: defineTable({
    groupId: v.id("groups"),
    membershipId: v.id("memberships"),
    userId: v.id("users"),
    dayKey: v.string(),
    pickWindowKey: v.optional(v.string()),
    matchId: v.id("matches"),
    teamId: v.id("teams"),
    status: v.union(v.literal("pending"), v.literal("won"), v.literal("lost")),
    createdAt: v.number(),
    updatedAt: v.number(),
    lockedAt: v.optional(v.number()),
  })
    .index("by_group_day", ["groupId", "dayKey"])
    .index("by_member", ["membershipId"])
    .index("by_member_day", ["membershipId", "dayKey"])
    .index("by_match", ["matchId"]),
  selectionResetVotes: defineTable({
    groupId: v.id("groups"),
    membershipId: v.id("memberships"),
    userId: v.id("users"),
    requestedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_group", ["groupId"])
    .index("by_group_membership", ["groupId", "membershipId"]),
});
