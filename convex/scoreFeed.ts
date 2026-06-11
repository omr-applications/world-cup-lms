export type NormalizedScoreResult = {
  matchNumber?: number;
  externalMatchId?: string;
  homeCode?: string;
  awayCode?: string;
  homeScore: number;
  awayScore: number;
};

export type NormalizedFixture = {
  matchNumber?: number;
  externalMatchId?: string;
  dayKey: string;
  label: string;
  kickoffAt: number;
  homeCode: string;
  awayCode: string;
  venue: string;
  stage?: string;
  round?: string;
};

type JsonRecord = Record<string, unknown>;

const completeStatuses = new Set([
  "complete",
  "completed",
  "finished",
  "final",
  "fulltime",
  "full-time",
  "ft",
  "aet",
  "pen",
  "postmatch",
]);

export function normalizeScoreFeed(payload: unknown): NormalizedScoreResult[] {
  return findCandidateRows(payload)
    .map(normalizeRow)
    .filter((result): result is NormalizedScoreResult => result !== null);
}

export function normalizeFixtureFeed(payload: unknown): NormalizedFixture[] {
  return findCandidateRows(payload)
    .map(normalizeFixtureRow)
    .filter((fixture): fixture is NormalizedFixture => fixture !== null);
}

function normalizeRow(row: unknown): NormalizedScoreResult | null {
  const record = asRecord(row);
  if (!record) {
    return null;
  }

  const status = getString(record, [
    "status",
    "matchStatus",
    "MatchStatus",
    "state",
    "fixture.status.short",
    "fixture.status.long",
    "time.status",
  ]);
  if (status && !completeStatuses.has(normalizeStatus(status))) {
    return null;
  }

  const homeScore = getNumber(record, [
    "homeScore",
    "home_score",
    "HomeScore",
    "score.home",
    "scores.home",
    "goals.home",
    "result.home",
    "home.score",
    "homeTeam.score",
    "HomeTeam.Score",
  ]);
  const awayScore = getNumber(record, [
    "awayScore",
    "away_score",
    "AwayScore",
    "score.away",
    "scores.away",
    "goals.away",
    "result.away",
    "away.score",
    "awayTeam.score",
    "AwayTeam.Score",
  ]);

  if (homeScore === null || awayScore === null) {
    return null;
  }

  return {
    matchNumber: getNumber(record, ["matchNumber", "match_number", "MatchNumber", "matchNo"]) ?? undefined,
    externalMatchId: getString(record, [
      "externalMatchId",
      "matchId",
      "match_id",
      "MatchId",
      "id",
      "fixture.id",
      "identifier",
    ]),
    homeCode: getString(record, [
      "homeCode",
      "home_code",
      "homeTeamCode",
      "home.code",
      "homeTeam.code",
      "teams.home.code",
      "HomeTeam.Abbreviation",
    ])?.toUpperCase(),
    awayCode: getString(record, [
      "awayCode",
      "away_code",
      "awayTeamCode",
      "away.code",
      "awayTeam.code",
      "teams.away.code",
      "AwayTeam.Abbreviation",
    ])?.toUpperCase(),
    homeScore,
    awayScore,
  };
}

function normalizeFixtureRow(row: unknown): NormalizedFixture | null {
  const record = asRecord(row);
  if (!record) {
    return null;
  }

  const kickoffValue = getString(record, [
    "kickoffAt",
    "kickoff",
    "date",
    "fixture.date",
    "startTime",
    "utcDate",
    "matchDate",
  ]);
  const kickoffAt = kickoffValue ? Date.parse(kickoffValue) : Number.NaN;
  if (!Number.isFinite(kickoffAt)) {
    return null;
  }

  const homeCode = getString(record, [
    "homeCode",
    "home_code",
    "homeTeamCode",
    "home.code",
    "homeTeam.code",
    "teams.home.code",
    "HomeTeam.Abbreviation",
  ])?.toUpperCase();
  const awayCode = getString(record, [
    "awayCode",
    "away_code",
    "awayTeamCode",
    "away.code",
    "awayTeam.code",
    "teams.away.code",
    "AwayTeam.Abbreviation",
  ])?.toUpperCase();

  if (!homeCode || !awayCode || isPlaceholderTeam(homeCode) || isPlaceholderTeam(awayCode)) {
    return null;
  }

  const dayKey = getString(record, ["dayKey", "matchDay", "match_day"]) ?? kickoffValue!.slice(0, 10);
  const label =
    getString(record, ["label", "dayLabel", "matchdayLabel"]) ??
    formatDayLabel(new Date(kickoffAt));

  return {
    matchNumber: getNumber(record, ["matchNumber", "match_number", "MatchNumber", "matchNo"]) ?? undefined,
    externalMatchId: getString(record, [
      "externalMatchId",
      "matchId",
      "match_id",
      "MatchId",
      "id",
      "fixture.id",
      "identifier",
    ]),
    dayKey,
    label,
    kickoffAt,
    homeCode,
    awayCode,
    venue:
      getString(record, [
        "venue",
        "venue.name",
        "stadium",
        "stadium.name",
        "location",
      ]) ?? "TBC",
    stage: getString(record, ["stage", "stage.name", "phase"]),
    round: getString(record, ["round", "round.name", "matchRound"]),
  };
}

function findCandidateRows(payload: unknown, depth = 0): unknown[] {
  if (depth > 3) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = asRecord(payload);
  if (!record) {
    return [];
  }

  for (const key of ["matches", "fixtures", "results", "response", "data", "items"]) {
    const child = record[key];
    if (Array.isArray(child)) {
      return child;
    }
    const nested = findCandidateRows(child, depth + 1);
    if (nested.length > 0) {
      return nested;
    }
  }

  return [];
}

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function getString(record: JsonRecord, paths: string[]) {
  for (const path of paths) {
    const value = getPath(record, path);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

function getNumber(record: JsonRecord, paths: string[]) {
  for (const path of paths) {
    const value = getPath(record, path);
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function getPath(record: JsonRecord, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    const currentRecord = asRecord(current);
    return currentRecord ? currentRecord[key] : undefined;
  }, record);
}

function normalizeStatus(status: string) {
  return status.toLowerCase().replace(/\s+/g, "").replaceAll("_", "-");
}

function isPlaceholderTeam(code: string) {
  const normalized = code.toLowerCase();
  return normalized === "tbd" || normalized === "tbc" || normalized.includes("winner") || normalized.includes("runner");
}

function formatDayLabel(date: Date) {
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${weekdays[date.getUTCDay()]}, ${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
}
