import { describe, expect, it } from "vitest";
import type { Id } from "./_generated/dataModel";
import {
  allMatchesHaveKickedOff,
  canChangePick,
  hasTeamAlreadyBeenUsed,
  isMatchPickable,
  pickOutcome,
  selectedTeamIsInMatch,
  type MatchForRules,
} from "./rules";
import { roundWindowForMatch } from "./pickWindows";
import { normalizeFixtureFeed, normalizeScoreFeed } from "./scoreFeed";

const teamA = "team_a" as Id<"teams">;
const teamB = "team_b" as Id<"teams">;
const teamC = "team_c" as Id<"teams">;
const matchA = "match_a" as Id<"matches">;

function match(overrides: Partial<MatchForRules> = {}): MatchForRules {
  return {
    _id: matchA,
    dayKey: "2026-06-11",
    kickoffAt: 1000,
    homeTeamId: teamA,
    awayTeamId: teamB,
    status: "scheduled",
    ...overrides,
  };
}

describe("LMS rule helpers", () => {
  it("blocks teams already used on previous days", () => {
    expect(
      hasTeamAlreadyBeenUsed(
        [{ dayKey: "2026-06-11", teamId: teamA, matchId: matchA, status: "won" }],
        teamA,
        "2026-06-12",
      ),
    ).toBe(true);
    expect(
      hasTeamAlreadyBeenUsed(
        [{ dayKey: "2026-06-11", teamId: teamA, matchId: matchA, status: "pending" }],
        teamA,
        "2026-06-11",
      ),
    ).toBe(false);
  });

  it("blocks teams already used in previous pick windows", () => {
    expect(
      hasTeamAlreadyBeenUsed(
        [{ dayKey: "2026-06-11", pickWindowKey: "group-round-1", teamId: teamA, matchId: matchA, status: "won" }],
        teamA,
        "group-round-2",
      ),
    ).toBe(true);
    expect(
      hasTeamAlreadyBeenUsed(
        [{ dayKey: "2026-06-11", pickWindowKey: "group-round-1", teamId: teamA, matchId: matchA, status: "pending" }],
        teamA,
        "group-round-1",
      ),
    ).toBe(false);
  });

  it("allows a team again when the old pick is before the latest selection reset", () => {
    expect(
      hasTeamAlreadyBeenUsed(
        [{ dayKey: "2026-06-11", teamId: teamA, matchId: matchA, status: "won", createdAt: 1000 }],
        teamA,
        "2026-06-17",
        2000,
      ),
    ).toBe(false);
    expect(
      hasTeamAlreadyBeenUsed(
        [{ dayKey: "2026-06-13", teamId: teamA, matchId: matchA, status: "won", createdAt: 3000 }],
        teamA,
        "2026-06-17",
        2000,
      ),
    ).toBe(true);
  });

  it("only allows scheduled matches before kickoff", () => {
    expect(isMatchPickable(match(), 999)).toBe(true);
    expect(isMatchPickable(match(), 1000)).toBe(false);
    expect(isMatchPickable(match({ status: "complete" }), 999)).toBe(false);
  });

  it("locks pick changes after the selected match kicks off", () => {
    expect(canChangePick(match(), 999)).toBe(true);
    expect(canChangePick(match(), 1000)).toBe(false);
    expect(canChangePick(null, 2000)).toBe(true);
  });

  it("requires the selected team to appear in the match", () => {
    expect(selectedTeamIsInMatch(match(), teamA)).toBe(true);
    expect(selectedTeamIsInMatch(match(), teamC)).toBe(false);
  });

  it("marks wins only when the picked team is the match winner", () => {
    expect(pickOutcome(match({ status: "complete", winnerTeamId: teamA }), teamA)).toBe("won");
    expect(pickOutcome(match({ status: "complete", winnerTeamId: teamB }), teamA)).toBe("lost");
    expect(pickOutcome(match({ status: "complete" }), teamA)).toBe("lost");
    expect(pickOutcome(match(), teamA)).toBe("pending");
  });

  it("detects when a no-pick elimination deadline has passed", () => {
    expect(allMatchesHaveKickedOff([match({ kickoffAt: 1000 }), match({ kickoffAt: 1200 })], 1200)).toBe(true);
    expect(allMatchesHaveKickedOff([match({ kickoffAt: 1000 }), match({ kickoffAt: 1200 })], 1199)).toBe(false);
    expect(allMatchesHaveKickedOff([], 9999)).toBe(false);
  });
});

describe("pick windows", () => {
  it("normalizes World Cup rounds into LMS pick windows", () => {
    expect(roundWindowForMatch(match({ round: "Group Round 1" })).key).toBe("group-round-1");
    expect(roundWindowForMatch(match({ round: "Round of 32" })).label).toBe("Last 32");
    expect(roundWindowForMatch(match({ round: "Quarter-final" })).key).toBe("quarter-finals");
  });
});

describe("score feed normalization", () => {
  it("normalizes simple completed match rows", () => {
    expect(
      normalizeScoreFeed({
        matches: [
          {
            matchNumber: 1,
            status: "complete",
            homeCode: "MEX",
            awayCode: "RSA",
            homeScore: 2,
            awayScore: 1,
          },
        ],
      }),
    ).toEqual([
      {
        matchNumber: 1,
        externalMatchId: undefined,
        homeCode: "MEX",
        awayCode: "RSA",
        homeScore: 2,
        awayScore: 1,
      },
    ]);
  });

  it("normalizes common football API fixture rows and ignores unfinished matches", () => {
    expect(
      normalizeScoreFeed({
        response: [
          {
            fixture: { id: 123, status: { short: "FT" } },
            teams: { home: { code: "ENG" }, away: { code: "CRO" } },
            goals: { home: "1", away: "1" },
          },
          {
            fixture: { id: 124, status: { short: "NS" } },
            teams: { home: { code: "ARG" }, away: { code: "AUT" } },
            goals: { home: null, away: null },
          },
        ],
      }),
    ).toEqual([
      {
        matchNumber: undefined,
        externalMatchId: "123",
        homeCode: "ENG",
        awayCode: "CRO",
        homeScore: 1,
        awayScore: 1,
      },
    ]);
  });
});

describe("fixture feed normalization", () => {
  it("normalizes known knockout fixtures and skips placeholder teams", () => {
    expect(
      normalizeFixtureFeed({
        fixtures: [
          {
            fixture: { id: 101, date: "2026-07-04T20:00:00.000Z" },
            teams: { home: { code: "ENG" }, away: { code: "ARG" } },
            venue: { name: "New York New Jersey" },
            round: { name: "Quarter-final" },
          },
          {
            fixture: { id: 102, date: "2026-07-05T20:00:00.000Z" },
            teams: { home: { code: "TBD" }, away: { code: "CRO" } },
          },
        ],
      }),
    ).toEqual([
      {
        matchNumber: undefined,
        externalMatchId: "101",
        dayKey: "2026-07-04",
        label: "Saturday, July 4",
        kickoffAt: Date.parse("2026-07-04T20:00:00.000Z"),
        homeCode: "ENG",
        awayCode: "ARG",
        venue: "New York New Jersey",
        stage: undefined,
        round: "Quarter-final",
      },
    ]);
  });
});
