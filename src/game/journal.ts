import type { GameState } from "./types";

export interface JournalDayEntry {
  day: number;
  label: string;
  assignment: string;
  disruption: string;
  nightSummary: string;
  dawnDeltaSummary: string;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function summarizeDeltas(log: GameState["nightLogs"][number] | undefined): string {
  if (!log) {
    return "Pending";
  }

  const camp = log.deltas.camp;
  const player = log.deltas.player;
  return [
    `Sup ${formatSigned(camp.supplies ?? 0)}`,
    `Mor ${formatSigned(camp.morale ?? 0)}`,
    `Dis ${formatSigned(camp.discipline ?? 0)}`,
    `Rum ${formatSigned(camp.rumor ?? 0)}`,
    `Warm ${formatSigned(player.warmth ?? 0)}`,
    `Sta ${formatSigned(player.stamina ?? 0)}`,
    `San ${formatSigned(player.sanity ?? 0)}`,
    `Inj ${formatSigned(player.injury ?? 0)}`,
  ].join(" | ");
}

export function buildRunJournalEntries(run: GameState): JournalDayEntry[] {
  const logByDay = new Map(run.nightLogs.map((log) => [log.day, log]));
  return run.schedule.map((entry) => {
    const log = logByDay.get(entry.day);
    return {
      day: entry.day,
      label: entry.label,
      assignment: `${entry.assignedDuty} / ${entry.assignedShift}`,
      disruption:
        entry.disruption.type === "NONE"
          ? "None"
          : entry.disruption.reason ?? entry.disruption.type,
      nightSummary: entry.summary ?? "Pending",
      dawnDeltaSummary: summarizeDeltas(log),
    };
  });
}

export function buildShareableRunText(run: GameState): string {
  const entries = buildRunJournalEntries(run);
  const lines = [
    `Lowborn Run Journal`,
    `Seed: ${run.seed}`,
    `Week: ${run.week} | Phase: ${run.phase} | Nights resolved: ${run.nightLogs.length}/7`,
    `Camp: supplies ${run.campStats.supplies}, morale ${run.campStats.morale}, discipline ${run.campStats.discipline}, rumor ${run.campStats.rumor}`,
    `Player: warmth ${run.playerStats.warmth}, stamina ${run.playerStats.stamina}, sanity ${run.playerStats.sanity}, injury ${run.playerStats.injury}`,
    "",
    "Daily Journal:",
  ];

  for (const entry of entries) {
    lines.push(
      `Day ${entry.day} (${entry.label})`,
      `  Assignment: ${entry.assignment}`,
      `  Disruption: ${entry.disruption}`,
      `  Night: ${entry.nightSummary}`,
      `  Dawn deltas: ${entry.dawnDeltaSummary}`
    );
  }

  if (run.weekSummary) {
    lines.push("", "Week Summary:", run.weekSummary.shareText);
  }

  return lines.join("\n");
}
