import { clamp } from "../utils/helpers";
import {
  gameStateSchema,
  saveEnvelopeV1Schema,
  saveEnvelopeV2Schema,
  saveEnvelopeV3Schema,
  saveEnvelopeV4Schema,
  saveEnvelopeV6Schema,
  saveEnvelopeV5Schema,
} from "./schema";
import { buildNpcProfiles, pickThreatSeed } from "./simulation";
import { ThreatSeed } from "./types";
import type {
  DayAssignment,
  DawnReport,
  DutyType,
  GameState,
  PatrolReport,
  ShiftType,
} from "./types";

export const CURRENT_SAVE_VERSION = 6;

type MigrationResult = {
  gameState: GameState;
  migrated: boolean;
};

const LEGACY_SHIFT_ROTATION: ShiftType[] = ["DAWN", "DAY", "DUSK"];

function normalizeThreatSeed(value: unknown): ThreatSeed {
  if (value === ThreatSeed.REAL || value === ThreatSeed.EXAGGERATED || value === ThreatSeed.NONE) {
    return value;
  }
  return ThreatSeed.NONE;
}

function campFallbackDuty(seedKey: string): DutyType {
  const keyCode = seedKey.length % 3;
  if (keyCode === 0) return "CAMP_WORK";
  if (keyCode === 1) return "CAMP_WAIT";
  return "REST";
}

function mapLegacyDutyToNew(duty: "PATROL" | "CAMP", seedKey: string): DutyType {
  if (duty === "PATROL") {
    return "PATROL";
  }
  return campFallbackDuty(seedKey);
}

function mapFromV2Shift(shift: "DAWN" | "DUSK" | "NIGHT"): ShiftType {
  if (shift === "NIGHT") {
    return "NIGHT";
  }
  return shift;
}

function normalizeReport(report: Partial<PatrolReport>): PatrolReport {
  const primaryClaim = report.claimedObservations?.[0] ?? "nothing unusual";
  return {
    npcId: report.npcId ?? "unknown-npc",
    npcName: report.npcName ?? report.npcId ?? "Unknown",
    claimedObservations: report.claimedObservations?.length ? report.claimedObservations : [primaryClaim],
    truthObservation: report.truthObservation ?? primaryClaim,
    presentedClaim: report.presentedClaim ?? primaryClaim,
    confidence: report.confidence ?? 0.5,
    emotion: report.emotion ?? "STEADY",
    isLying: report.isLying ?? false,
  };
}

function buildRumorAdoptionState(
  npcProfiles: GameState["npcProfiles"],
  existing?: GameState["hidden"]["rumorAdoption"]
): GameState["hidden"]["rumorAdoption"] {
  const next: GameState["hidden"]["rumorAdoption"] = {};
  for (const npc of npcProfiles) {
    const prior = existing?.[npc.id];
    next[npc.id] = {
      adopted: prior?.adopted ?? false,
      heardCount: prior?.heardCount ?? 0,
      spreadCount: prior?.spreadCount ?? 0,
      lastHeardDay: prior?.lastHeardDay ?? null,
    };
  }
  return next;
}

function buildLegacyDawnReport(day: number, log: GameState["nightLogs"][number] | undefined): DawnReport {
  const deltas = {
    supplies: log?.deltas.camp.supplies ?? 0,
    morale: log?.deltas.camp.morale ?? 0,
    discipline: log?.deltas.camp.discipline ?? 0,
    rumor: log?.deltas.camp.rumor ?? 0,
    warmth: log?.deltas.player.warmth ?? 0,
    stamina: log?.deltas.player.stamina ?? 0,
    sanity: log?.deltas.player.sanity ?? 0,
    injury: log?.deltas.player.injury ?? 0,
  };

  return {
    day,
    title: `Dawn Report - Day ${day}`,
    summary: "Migrated report: review stats before starting next day.",
    rumorReachCount: log?.rumorReachCount ?? 0,
    deltas,
  };
}

function normalizeNightLogs(logs: Array<Partial<GameState["nightLogs"][number]>>): GameState["nightLogs"] {
  return logs.map((log) => ({
    day: clamp(log.day ?? 1, 1, 7),
    events: log.events?.length ? log.events : ["Legacy log entry"],
    dutyResolved: log.dutyResolved ?? "CAMP_WAIT",
    debriefChoice: log.debriefChoice ?? null,
    rumorReachCount: log.rumorReachCount ?? 0,
    deltas: {
      player: {
        warmth: log.deltas?.player.warmth,
        stamina: log.deltas?.player.stamina,
        injury: log.deltas?.player.injury,
        hunger: log.deltas?.player.hunger,
        sanity: log.deltas?.player.sanity,
      },
      camp: {
        supplies: log.deltas?.camp.supplies,
        morale: log.deltas?.camp.morale,
        discipline: log.deltas?.camp.discipline,
        rumor: log.deltas?.camp.rumor,
      },
    },
    reports: (log.reports ?? []).map((report) => normalizeReport(report)),
    rumorPackets: log.rumorPackets ?? [],
    flags: log.flags ?? [],
  }));
}

function hydrateHidden(
  seed: string,
  npcProfiles: GameState["npcProfiles"],
  hidden: Partial<GameState["hidden"]> | null | undefined
): GameState["hidden"] {
  return {
    threatSeed: normalizeThreatSeed(hidden?.threatSeed ?? pickThreatSeed(seed)),
    investigationFocus: hidden?.investigationFocus ?? 0,
    intenseStreak: hidden?.intenseStreak ?? 0,
    pendingAccusationConflict: hidden?.pendingAccusationConflict ?? false,
    rumorAdoption: buildRumorAdoptionState(npcProfiles, hidden?.rumorAdoption),
    lastDebrief: hidden?.lastDebrief ?? null,
  };
}

function finalizeState(
  state: Omit<GameState, "hidden" | "nightLogs" | "weekSummary"> & {
    weekSummary?: GameState["weekSummary"];
    hidden?: Partial<GameState["hidden"]> | null;
    nightLogs?: Array<Partial<GameState["nightLogs"][number]>>;
  }
): GameState {
  const nightLogs = normalizeNightLogs(state.nightLogs ?? []);
  const dawnReport =
    state.dawnReport && typeof state.dawnReport.rumorReachCount === "number"
      ? state.dawnReport
      : state.dawnReport
        ? {
            ...state.dawnReport,
            rumorReachCount: nightLogs[nightLogs.length - 1]?.rumorReachCount ?? 0,
          }
        : null;

  return gameStateSchema.parse({
    ...state,
    nightLogs,
    dawnReport,
    weekSummary: state.weekSummary ?? null,
    hidden: hydrateHidden(state.seed, state.npcProfiles, state.hidden),
  });
}

function mapLegacyPhase(
  phase: "DAY" | "NIGHT",
  complete: boolean,
  day: number,
  nightLogs: GameState["nightLogs"]
): { phase: GameState["phase"]; dawnReport: DawnReport | null } {
  if (complete) {
    return { phase: "DAY", dawnReport: null };
  }
  if (phase === "NIGHT") {
    const latestLog = nightLogs.find((entry) => entry.day === day) ?? nightLogs[nightLogs.length - 1];
    return {
      phase: "DAWN_REPORT",
      dawnReport: buildLegacyDawnReport(day, latestLog),
    };
  }
  return { phase: "DAY", dawnReport: null };
}

function migrateFromV4(gameState: {
  seed: string;
  week: number;
  todayIndex: number;
  schedule: GameState["schedule"];
  phase: GameState["phase"];
  activeNightScene: any;
  dawnReport: any;
  playerStats: GameState["playerStats"];
  campStats: GameState["campStats"];
  npcProfiles: GameState["npcProfiles"];
  nightLogs: Array<Partial<GameState["nightLogs"][number]>>;
  recentEvents: string[];
  todaySummary: string;
  complete: boolean;
  hidden: {
    threatSeed: unknown;
  };
}): GameState {
  const activeNightScene = gameState.activeNightScene
    ? {
        ...gameState.activeNightScene,
        investigationActive: gameState.activeNightScene.investigationActive ?? false,
        debriefReports: (gameState.activeNightScene.debriefReports ?? []).map((report: Partial<PatrolReport>) =>
          normalizeReport(report)
        ),
      }
    : null;

  return finalizeState({
    ...gameState,
    activeNightScene,
    hidden: {
      threatSeed: normalizeThreatSeed(gameState.hidden?.threatSeed),
    },
  });
}

function migrateFromV3(gameState: {
  seed: string;
  week: number;
  todayIndex: number;
  schedule: GameState["schedule"];
  phase: "DAY" | "NIGHT";
  playerStats: GameState["playerStats"];
  campStats: GameState["campStats"];
  npcProfiles: GameState["npcProfiles"];
  nightLogs: Array<Partial<GameState["nightLogs"][number]>>;
  recentEvents: string[];
  todaySummary: string;
  complete: boolean;
  hidden: {
    threatSeed: unknown;
  };
}): GameState {
  const normalizedNightLogs = normalizeNightLogs(gameState.nightLogs);
  const day = clamp(gameState.todayIndex + 1, 1, 7);
  const phaseMap = mapLegacyPhase(gameState.phase, gameState.complete, day, normalizedNightLogs);

  return finalizeState({
    seed: gameState.seed,
    week: gameState.week,
    todayIndex: gameState.todayIndex,
    schedule: gameState.schedule,
    phase: phaseMap.phase,
    activeNightScene: null,
    dawnReport: phaseMap.dawnReport,
    playerStats: gameState.playerStats,
    campStats: gameState.campStats,
    npcProfiles: gameState.npcProfiles,
    nightLogs: normalizedNightLogs,
    recentEvents: gameState.recentEvents,
    todaySummary: gameState.todaySummary,
    complete: gameState.complete,
    hidden: {
      threatSeed: normalizeThreatSeed(gameState.hidden?.threatSeed),
    },
  });
}

function migrateFromV2(gameState: {
  seed: string;
  week: number;
  day: number;
  weekSchedule: Array<{
    day: number;
    label: string;
    dutyType: "PATROL" | "CAMP";
    shift: "DAWN" | "DUSK" | "NIGHT";
    resolved: boolean;
    eventTitle: string | null;
    summary: string | null;
  }>;
  playerStats: GameState["playerStats"];
  campStats: GameState["campStats"];
  npcProfiles: GameState["npcProfiles"];
  nightLogs: Array<{
    day: number;
    events: string[];
    deltas: {
      player: Record<string, number>;
      camp: Record<string, number>;
    };
    reports: Array<Partial<PatrolReport>>;
    flags: string[];
  }>;
  recentEvents: string[];
  todaySummary: string;
  complete: boolean;
  hidden: {
    threatSeed: string;
  };
}): GameState {
  const todayIndex = clamp(gameState.day - 1, 0, 6);

  const schedule = gameState.weekSchedule.map<DayAssignment>((entry) => {
    const mappedDuty = mapLegacyDutyToNew(
      entry.dutyType,
      `${gameState.seed}:legacy-v2:day:${entry.day}`
    );
    const mappedShift = mapFromV2Shift(entry.shift);
    return {
      day: entry.day,
      label: entry.label,
      scheduledDuty: mappedDuty,
      scheduledShift: mappedShift,
      assignedDuty: mappedDuty,
      assignedShift: mappedShift,
      disruption: {
        type: "NONE",
        chance: 0,
        reason: null,
        extraDuty: null,
      },
      resolved: entry.resolved,
      eventTitle: entry.eventTitle,
      summary: entry.summary,
    };
  }) as GameState["schedule"];

  const mappedNightLogs: Array<Partial<GameState["nightLogs"][number]>> = gameState.nightLogs.map(
    (log, index) => ({
      day: log.day,
      events: log.events,
      dutyResolved: schedule[clamp(log.day - 1, 0, 6)]?.assignedDuty ?? "CAMP_WAIT",
      deltas: {
        player: {
          warmth: log.deltas.player.warmth,
          stamina: log.deltas.player.stamina,
          injury: log.deltas.player.injury,
          hunger: log.deltas.player.hunger,
          sanity: log.deltas.player.sanity,
        },
        camp: {
          supplies: log.deltas.camp.supplies,
          morale: log.deltas.camp.morale,
          discipline: log.deltas.camp.discipline,
          rumor: log.deltas.camp.rumor,
        },
      },
      reports: log.reports.map((report) => normalizeReport(report)),
      flags: log.flags.length > 0 ? log.flags : [`LEGACY_LOG_${index + 1}`],
    })
  );

  const normalizedLogs = normalizeNightLogs(mappedNightLogs);
  const shouldShowDawn = !gameState.complete && schedule[todayIndex]?.resolved;

  return finalizeState({
    seed: gameState.seed,
    week: gameState.week,
    todayIndex,
    schedule,
    phase: shouldShowDawn ? "DAWN_REPORT" : "DAY",
    activeNightScene: null,
    dawnReport: shouldShowDawn
      ? buildLegacyDawnReport(gameState.day, normalizedLogs[normalizedLogs.length - 1])
      : null,
    playerStats: gameState.playerStats,
    campStats: gameState.campStats,
    npcProfiles: gameState.npcProfiles,
    nightLogs: normalizedLogs,
    recentEvents: gameState.recentEvents,
    todaySummary: gameState.todaySummary,
    complete: gameState.complete,
    hidden: {
      threatSeed: normalizeThreatSeed(gameState.hidden.threatSeed),
    },
  });
}

function migrateFromV1(snapshot: {
  seed: string;
  week: number;
  day: number;
  schedule: Array<{
    day: number;
    label: string;
    plannedDuty: "PATROL" | "CAMP";
    resolved: boolean;
    eventTitle: string | null;
    summary: string | null;
  }>;
  stats: {
    supplies: number;
    morale: number;
    discipline: number;
    rumor: number;
    warmth: number;
    stamina: number;
    sanity: number;
  };
  todaySummary: string;
  log: string[];
  complete: boolean;
}): GameState {
  const todayIndex = clamp(snapshot.day - 1, 0, 6);

  const schedule = snapshot.schedule.map<DayAssignment>((entry, index) => {
    const mappedDuty = mapLegacyDutyToNew(
      entry.plannedDuty,
      `${snapshot.seed}:legacy-v1:day:${entry.day}`
    );
    const shift = LEGACY_SHIFT_ROTATION[index % LEGACY_SHIFT_ROTATION.length]!;
    return {
      day: entry.day,
      label: entry.label,
      scheduledDuty: mappedDuty,
      scheduledShift: shift,
      assignedDuty: mappedDuty,
      assignedShift: shift,
      disruption: {
        type: "NONE",
        chance: 0,
        reason: null,
        extraDuty: null,
      },
      resolved: entry.resolved,
      eventTitle: entry.eventTitle,
      summary: entry.summary,
    };
  }) as GameState["schedule"];

  return finalizeState({
    seed: snapshot.seed,
    week: snapshot.week,
    todayIndex,
    schedule,
    phase: "DAY",
    activeNightScene: null,
    dawnReport: null,
    playerStats: {
      warmth: snapshot.stats.warmth,
      stamina: snapshot.stats.stamina,
      injury: Math.max(0, 100 - snapshot.stats.stamina),
      hunger: Math.max(0, 100 - snapshot.stats.supplies),
      sanity: snapshot.stats.sanity,
    },
    campStats: {
      supplies: snapshot.stats.supplies,
      morale: snapshot.stats.morale,
      discipline: snapshot.stats.discipline,
      rumor: snapshot.stats.rumor,
    },
    npcProfiles: buildNpcProfiles(snapshot.seed),
    nightLogs: [],
    recentEvents: snapshot.log,
    todaySummary: snapshot.todaySummary,
    complete: snapshot.complete,
    hidden: {
      threatSeed: pickThreatSeed(snapshot.seed),
    },
  });
}

export function migrateSavePayload(raw: unknown): MigrationResult | null {
  const v6 = saveEnvelopeV6Schema.safeParse(raw);
  if (v6.success) {
    return {
      gameState: finalizeState(v6.data.gameState),
      migrated: false,
    };
  }

  const v5 = saveEnvelopeV5Schema.safeParse(raw);
  if (v5.success) {
    return {
      gameState: finalizeState(v5.data.gameState),
      migrated: true,
    };
  }

  const v4 = saveEnvelopeV4Schema.safeParse(raw);
  if (v4.success) {
    return {
      gameState: migrateFromV4(v4.data.gameState),
      migrated: true,
    };
  }

  const v3 = saveEnvelopeV3Schema.safeParse(raw);
  if (v3.success) {
    return {
      gameState: migrateFromV3(v3.data.gameState),
      migrated: true,
    };
  }

  const v2 = saveEnvelopeV2Schema.safeParse(raw);
  if (v2.success) {
    return {
      gameState: migrateFromV2(v2.data.gameState),
      migrated: true,
    };
  }

  const v1 = saveEnvelopeV1Schema.safeParse(raw);
  if (v1.success) {
    return {
      gameState: migrateFromV1(v1.data.snapshot),
      migrated: true,
    };
  }

  return null;
}

export function toSaveEnvelope(gameState: GameState) {
  return {
    version: CURRENT_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    gameState: gameStateSchema.parse(gameState),
  };
}
