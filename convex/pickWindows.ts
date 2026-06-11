import type { Doc } from "./_generated/dataModel";

export type ScheduleMode = "day" | "round";

type MatchLike = Pick<Doc<"matches">, "dayKey" | "kickoffAt" | "round" | "stage">;
type DayLike = Pick<Doc<"tournamentDays">, "dayKey" | "label" | "sortOrder" | "firstKickoffAt">;

export type PickWindow = {
  key: string;
  label: string;
  sortOrder: number;
  firstKickoffAt: number;
  dayKeys: string[];
  firstDayKey: string;
};

const ROUND_DEFS = [
  { key: "group-round-1", label: "Group Round 1", sortOrder: 10, patterns: [/group.*(?:round|matchday|md)?\s*1/i, /matchday\s*1/i] },
  { key: "group-round-2", label: "Group Round 2", sortOrder: 20, patterns: [/group.*(?:round|matchday|md)?\s*2/i, /matchday\s*2/i] },
  { key: "group-round-3", label: "Group Round 3", sortOrder: 30, patterns: [/group.*(?:round|matchday|md)?\s*3/i, /matchday\s*3/i] },
  { key: "round-of-32", label: "Last 32", sortOrder: 40, patterns: [/round\s*of\s*32/i, /last\s*32/i] },
  { key: "round-of-16", label: "Last 16", sortOrder: 50, patterns: [/round\s*of\s*16/i, /last\s*16/i] },
  { key: "quarter-finals", label: "Quarter-finals", sortOrder: 60, patterns: [/quarter/i] },
  { key: "semi-finals", label: "Semi-finals", sortOrder: 70, patterns: [/semi/i] },
  { key: "final", label: "Final", sortOrder: 80, patterns: [/^final$/i, / final/i] },
] as const;

export function groupScheduleMode(group: Pick<Doc<"groups">, "scheduleMode">): ScheduleMode {
  return group.scheduleMode ?? "day";
}

export function dayWindow(day: DayLike): PickWindow {
  return {
    key: day.dayKey,
    label: day.label,
    sortOrder: day.sortOrder,
    firstKickoffAt: day.firstKickoffAt,
    dayKeys: [day.dayKey],
    firstDayKey: day.dayKey,
  };
}

export function roundWindowForMatch(match: MatchLike, day?: DayLike): PickWindow {
  const source = `${match.round ?? ""} ${match.stage ?? ""}`.trim();
  const roundDef = ROUND_DEFS.find((definition) =>
    definition.patterns.some((pattern) => pattern.test(source)),
  );

  if (roundDef) {
    return {
      key: roundDef.key,
      label: roundDef.label,
      sortOrder: roundDef.sortOrder,
      firstKickoffAt: match.kickoffAt,
      dayKeys: [match.dayKey],
      firstDayKey: match.dayKey,
    };
  }

  return dayWindow(
    day ?? {
      dayKey: match.dayKey,
      label: match.dayKey,
      sortOrder: Number(match.dayKey.replaceAll("-", "")),
      firstKickoffAt: match.kickoffAt,
    },
  );
}

export function mergePickWindows(windows: PickWindow[]) {
  const byKey = new Map<string, PickWindow>();

  for (const window of windows) {
    const existing = byKey.get(window.key);
    if (!existing) {
      byKey.set(window.key, window);
      continue;
    }

    const firstKickoffAt = Math.min(existing.firstKickoffAt, window.firstKickoffAt);
    const firstDayKey = firstKickoffAt === window.firstKickoffAt ? window.firstDayKey : existing.firstDayKey;
    byKey.set(window.key, {
      ...existing,
      sortOrder: Math.min(existing.sortOrder, window.sortOrder),
      firstKickoffAt,
      firstDayKey,
      dayKeys: Array.from(new Set([...existing.dayKeys, ...window.dayKeys])),
    });
  }

  return Array.from(byKey.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.firstKickoffAt - b.firstKickoffAt);
}

export function pickWindowKeyForPick(pick: { dayKey: string; pickWindowKey?: string }) {
  return pick.pickWindowKey ?? pick.dayKey;
}
