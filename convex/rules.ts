import type { Id } from "./_generated/dataModel";

export type MatchForRules = {
  _id: Id<"matches">;
  dayKey: string;
  kickoffAt: number;
  homeTeamId: Id<"teams">;
  awayTeamId: Id<"teams">;
  status: "scheduled" | "complete";
  winnerTeamId?: Id<"teams">;
};

export type PickForRules = {
  dayKey: string;
  teamId: Id<"teams">;
  matchId: Id<"matches">;
  status: "pending" | "won" | "lost";
  createdAt?: number;
};

export function hasTeamAlreadyBeenUsed(
  picks: PickForRules[],
  teamId: Id<"teams">,
  currentDayKey?: string,
  selectionResetAt?: number,
) {
  return picks.some(
    (pick) =>
      pick.teamId === teamId &&
      pick.dayKey !== currentDayKey &&
      (!selectionResetAt || !pick.createdAt || pick.createdAt > selectionResetAt),
  );
}

export function isMatchPickable(match: MatchForRules, now: number) {
  return match.status === "scheduled" && match.kickoffAt > now;
}

export function canChangePick(existingPickMatch: MatchForRules | null, now: number) {
  if (!existingPickMatch) {
    return true;
  }

  return existingPickMatch.kickoffAt > now;
}

export function selectedTeamIsInMatch(match: MatchForRules, teamId: Id<"teams">) {
  return match.homeTeamId === teamId || match.awayTeamId === teamId;
}

export function pickOutcome(match: MatchForRules, teamId: Id<"teams">) {
  if (match.status !== "complete") {
    return "pending" as const;
  }

  return match.winnerTeamId === teamId ? ("won" as const) : ("lost" as const);
}

export function allMatchesHaveKickedOff(matches: MatchForRules[], now: number) {
  return matches.length > 0 && matches.every((match) => match.kickoffAt <= now);
}
