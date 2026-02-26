/**
 * Core game simulation engine for Lowborn
 * Handles:
 * - Week schedule generation
 * - Daily disruptions and reassignments
 * - Night event resolution and player decision-making
 * - Debrief scene generation and NPC reports
 * - Rumor propagation mechanics
 * - Player/camp stat calculations
 * - Week summary and end-game determination
 *
 * All randomness is deterministic (seeded) to enable:
 * - Reproducible runs with same seed
 * - Replay/journal functionality
 * - Testing and balance tuning
 */

import { nightEventCards } from "../content/events";
import { frontierNames } from "../content/names";
import { npcTemplates } from "../content/npcs";
import { clamp } from "../utils/helpers";
import { createSeededRng } from "../utils/rng";
import { gameStateSchema } from "./schema";
import { ThreatSeed } from "./types";
import type {
  CampStats,
  DailyDisruption,
  DebriefChoiceId,
  DebriefSnapshot,
  DawnReport,
  DayAssignment,
  DutyType,
  GameState,
  NPCProfile,
  NightDecisionOption,
  NightEventCard,
  NightLog,
  NightScene,
  PatrolReport,
  PlayerStats,
  ReportEmotion,
  RumorPacket,
  ShiftType,
  WeekSummary,
  WeekSchedule,
} from "./types";

export const DEFAULT_SEED = "lowborn-week-seed";

const DAY_LABELS = [
  "Day 1 - Frostwake",
  "Day 2 - Longwind",
  "Day 3 - Coldreach",
  "Day 4 - Ironveil",
  "Day 5 - Ashrest",
  "Day 6 - Graywatch",
  "Day 7 - Last Ember",
] as const;

const PATROL_ROUTE_SUFFIXES = [
  "Snowfall is thin enough to read tracks.",
  "Lantern light barely reaches the outer stakes.",
  "Wind carries every sound from the ridge.",
  "The frost line has swallowed old path markers.",
] as const;

const SANITY_OVERLAY_LINES = [
  "For one breath, you see a second patrol crossing your own tracks.",
  "Lantern shadows gather into a shape that vanishes when you turn.",
  "You hear your own name carried from beyond the marker line.",
  "Footsteps echo behind you, but the snow remains untouched.",
] as const;

const DEBRIEF_CLAIMS = [
  "tracks in snow",
  "distant light",
  "howl",
  "missing man",
  "nothing unusual",
  "strange symbol",
] as const;

const ALARMING_DEBRIEF_CLAIMS = [
  "tracks in snow",
  "distant light",
  "howl",
  "missing man",
  "strange symbol",
] as const;

const BASE_PLAYER_STATS: PlayerStats = {
  warmth: 55,
  stamina: 60,
  injury: 8,
  hunger: 35,
  sanity: 55,
};

const BASE_CAMP_STATS: CampStats = {
  supplies: 50,
  morale: 50,
  discipline: 50,
  rumor: 25,
};

function isIntenseEvent(card: NightEventCard): boolean {
  return card.tags.includes("hazard") || card.tags.includes("internal") || card.tags.includes("shock");
}

function isCalmEvent(card: NightEventCard): boolean {
  return card.tags.includes("mundane") && !isIntenseEvent(card);
}

function toWeekSchedule(assignments: DayAssignment[]): WeekSchedule {
  if (assignments.length !== 7) {
    throw new Error("Week schedule must contain exactly 7 assignments.");
  }
  return assignments as WeekSchedule;
}

function shiftForDuty(duty: DutyType, seedKey: string): ShiftType {
  const rng = createSeededRng(seedKey);
  if (duty === "NIGHT_WATCH") {
    return "NIGHT";
  }
  if (duty === "PATROL") {
    return rng.weightedPick<ShiftType>([
      { value: "DAWN", weight: 6 },
      { value: "DUSK", weight: 4 },
    ]);
  }
  if (duty === "REST") {
    return rng.weightedPick<ShiftType>([
      { value: "DAY", weight: 4 },
      { value: "DUSK", weight: 2 },
    ]);
  }
  return rng.weightedPick<ShiftType>([
    { value: "DAY", weight: 5 },
    { value: "DUSK", weight: 3 },
    { value: "DAWN", weight: 2 },
  ]);
}

function makeNoDisruption(chance: number): DailyDisruption {
  return {
    type: "NONE",
    chance,
    reason: null,
    extraDuty: null,
  };
}

function summarizeDisruption(disruption: DailyDisruption): string {
  if (disruption.type === "NONE") {
    return "No disruption reported.";
  }
  return `Disruption: ${disruption.reason ?? "Command override issued."}`;
}

function daySummary(assignment: DayAssignment): string {
  const disruptionLine = summarizeDisruption(assignment.disruption);
  const extraDutyLine =
    assignment.disruption.extraDuty === "NIGHT_WATCH"
      ? "Extra duty posted: NIGHT_WATCH tonight."
      : "";
  return [
    `${assignment.label}: ${assignment.assignedDuty} (${assignment.assignedShift}).`,
    disruptionLine,
    extraDutyLine,
  ]
    .filter(Boolean)
    .join(" ");
}

function mergePlayerDeltas(...deltas: Array<Partial<PlayerStats>>): Partial<PlayerStats> {
  return {
    warmth: deltas.reduce((sum, item) => sum + (item.warmth ?? 0), 0),
    stamina: deltas.reduce((sum, item) => sum + (item.stamina ?? 0), 0),
    injury: deltas.reduce((sum, item) => sum + (item.injury ?? 0), 0),
    hunger: deltas.reduce((sum, item) => sum + (item.hunger ?? 0), 0),
    sanity: deltas.reduce((sum, item) => sum + (item.sanity ?? 0), 0),
  };
}

function mergeCampDeltas(...deltas: Array<Partial<CampStats>>): Partial<CampStats> {
  return {
    supplies: deltas.reduce((sum, item) => sum + (item.supplies ?? 0), 0),
    morale: deltas.reduce((sum, item) => sum + (item.morale ?? 0), 0),
    discipline: deltas.reduce((sum, item) => sum + (item.discipline ?? 0), 0),
    rumor: deltas.reduce((sum, item) => sum + (item.rumor ?? 0), 0),
  };
}

function applyPlayerDelta(stats: PlayerStats, delta: Partial<PlayerStats>): PlayerStats {
  return {
    warmth: clamp(stats.warmth + (delta.warmth ?? 0), 0, 100),
    stamina: clamp(stats.stamina + (delta.stamina ?? 0), 0, 100),
    injury: clamp(stats.injury + (delta.injury ?? 0), 0, 100),
    hunger: clamp(stats.hunger + (delta.hunger ?? 0), 0, 100),
    sanity: clamp(stats.sanity + (delta.sanity ?? 0), 0, 100),
  };
}

function applyCampDelta(stats: CampStats, delta: Partial<CampStats>): CampStats {
  return {
    supplies: clamp(stats.supplies + (delta.supplies ?? 0), 0, 100),
    morale: clamp(stats.morale + (delta.morale ?? 0), 0, 100),
    discipline: clamp(stats.discipline + (delta.discipline ?? 0), 0, 100),
    rumor: clamp(stats.rumor + (delta.rumor ?? 0), 0, 100),
  };
}

function swapDuty(scheduledDuty: DutyType, seedKey: string): DutyType {
  if (scheduledDuty === "PATROL") {
    const rng = createSeededRng(seedKey);
    return rng.weightedPick<DutyType>([
      { value: "CAMP_WORK", weight: 4 },
      { value: "CAMP_WAIT", weight: 3 },
      { value: "REST", weight: 2 },
    ]);
  }
  return "PATROL";
}

function buildWeeklyDisruptionPlan(seed: string, week: number): Set<number> {
  const rng = createSeededRng(`${seed}:week:${week}:disruption-plan`);
  const disruptionTarget = rng.nextInt(1, 3);
  const availableDays = [1, 2, 3, 4, 5, 6, 7];
  const planned = new Set<number>();

  while (planned.size < disruptionTarget) {
    planned.add(rng.pick(availableDays));
  }
  return planned;
}

function pickDisruptionType(
  assignment: DayAssignment,
  rng: ReturnType<typeof createSeededRng>
): DailyDisruption["type"] {
  const scheduled = assignment.scheduledDuty;
  if (scheduled === "PATROL") {
    return rng.weightedPick<DailyDisruption["type"]>([
      { value: "SWAP", weight: 6 },
      { value: "EXTRA_DUTY", weight: 4 },
    ]);
  }

  if (scheduled === "NIGHT_WATCH") {
    return rng.weightedPick<DailyDisruption["type"]>([
      { value: "FILL_IN_PATROL", weight: 6 },
      { value: "SWAP", weight: 4 },
    ]);
  }

  return rng.weightedPick<DailyDisruption["type"]>([
    { value: "FILL_IN_PATROL", weight: 4 },
    { value: "SWAP", weight: 3 },
    { value: "EXTRA_DUTY", weight: 3 },
  ]);
}

function buildPatrolChoices(tags: string[]): NightDecisionOption[] {
  const hazard = tags.includes("hazard");
  const ambiguous = tags.includes("ambiguous");
  const internal = tags.includes("internal");
  const shock = tags.includes("shock");
  const mundane = tags.includes("mundane") && !hazard && !internal && !shock;

  return [
    {
      id: "press-forward",
      label: "Press forward",
      description: "Push deeper to confirm signs before returning.",
      playerDelta: {
        stamina: mundane ? -1 : -3,
        injury: hazard ? 2 + (shock ? 1 : 0) : mundane ? 0 : 1,
        sanity: ambiguous ? -1 - (shock ? 1 : 0) : shock ? -2 : mundane ? 1 : 0,
      },
      campDelta: {
        discipline: 1,
        rumor: ambiguous || shock ? 1 : mundane ? -1 : 0,
      },
      logText: "You pushed deeper before falling back to the line.",
    },
    {
      id: "mark-and-return",
      label: "Mark and return",
      description: "Mark the route and report at first safe chance.",
      playerDelta: {
        stamina: -1,
        sanity: ambiguous || shock ? -1 : 1,
      },
      campDelta: {
        discipline: 1,
        rumor: ambiguous || shock ? 1 : mundane ? -1 : 0,
        morale: internal ? -1 : 0,
      },
      logText: "You marked the route and returned with a measured report.",
    },
    {
      id: "hold-position",
      label: "Hold position",
      description: "Conserve strength and shadow the area from distance.",
      playerDelta: {
        warmth: -1,
        stamina: -1,
        sanity: shock ? -1 : 1,
      },
      campDelta: {
        rumor: mundane ? 0 : shock ? 3 : 2,
        morale: mundane ? 0 : shock ? -2 : -1,
      },
      logText: "You held observation and returned with limited certainty.",
    },
  ];
}

function buildCampChoices(): NightDecisionOption[] {
  return [
    {
      id: "ESCALATE_COMMANDER",
      label: "Escalate to commander",
      description: "File an immediate alarm and force stricter report protocol.",
      playerDelta: { sanity: -1 },
      campDelta: { discipline: 2, morale: -2, rumor: 2 },
      logText: "You escalated the debrief to command authority.",
    },
    {
      id: "DOWNPLAY",
      label: "Downplay",
      description: "Treat the debrief as noise and calm the line publicly.",
      playerDelta: { sanity: 1 },
      campDelta: { discipline: -2, morale: 2, rumor: -2 },
      logText: "You downplayed the reports and steadied the hall.",
    },
    {
      id: "INVESTIGATE_QUIETLY",
      label: "Investigate quietly",
      description: "Track the claims privately and pull threads on the next patrol.",
      playerDelta: { stamina: -1, sanity: -1 },
      campDelta: { discipline: 1, rumor: 1 },
      logText: "You opened a quiet inquiry and kept it off the board.",
    },
    {
      id: "ACCUSE_LIAR",
      label: "Accuse liar",
      description: "Call out one report as false in front of the barracks.",
      playerDelta: { sanity: -2 },
      campDelta: { discipline: 1, morale: -1, rumor: 2 },
      logText: "You accused one scout of lying during debrief.",
    },
  ];
}

function threatModifierForEvent(
  threatSeed: ThreatSeed,
  card: NightEventCard,
  day: number
): {
  player: Partial<PlayerStats>;
  camp: Partial<CampStats>;
} {
  const earlyWeek = day <= 2;
  if (isCalmEvent(card)) {
    if (threatSeed === ThreatSeed.REAL) {
      return {
        player: { sanity: earlyWeek ? 0 : -1 },
        camp: { rumor: 1 },
      };
    }
    if (threatSeed === ThreatSeed.EXAGGERATED) {
      return {
        player: { sanity: earlyWeek ? 0 : -1 },
        camp: { rumor: 1, discipline: earlyWeek ? 0 : -1 },
      };
    }
    return {
      player: { sanity: 1 },
      camp: { rumor: -1, morale: 1 },
    };
  }

  if (threatSeed === ThreatSeed.REAL) {
    return {
      player: { sanity: -1, stamina: earlyWeek ? 0 : -1 },
      camp: { rumor: earlyWeek ? 1 : 2, morale: earlyWeek ? 0 : -1 },
    };
  }
  if (threatSeed === ThreatSeed.EXAGGERATED) {
    return {
      player: { sanity: earlyWeek ? 0 : -1 },
      camp: { rumor: earlyWeek ? 2 : 3, discipline: earlyWeek ? 0 : -1 },
    };
  }
  return {
    player: { sanity: 1 },
    camp: { rumor: -1, morale: 1 },
  };
}

function threatEscalationCurve(day: number): number {
  return clamp((day - 1) / 6, 0, 1);
}

function eventWeightForThreat(
  card: NightEventCard,
  sceneType: NightScene["sceneType"],
  threatSeed: ThreatSeed,
  day: number,
  investigationActive: boolean,
  intenseStreak: number
): number {
  const curve = threatEscalationCurve(day);
  const hasHazard = card.tags.includes("hazard");
  const hasAmbiguous = card.tags.includes("ambiguous");
  const hasMundane = card.tags.includes("mundane");
  const hasInternal = card.tags.includes("internal");
  const hasShock = card.tags.includes("shock");

  let weight = 1;
  const veryEarly = day <= 2;

  if (sceneType === "PATROL") {
    if (threatSeed === ThreatSeed.REAL) {
      if (hasMundane) weight += 2.1 - curve * 0.7;
      if (hasAmbiguous) weight += 0.6 + curve * 1.3;
      if (hasHazard) weight += 0.25 + curve * 1.1;
      if (hasInternal) weight += 0.2 + curve * 0.8;
      if (hasShock) weight += day <= 3 ? 0.03 : 0.12 + curve * 0.35;
    } else if (threatSeed === ThreatSeed.EXAGGERATED) {
      if (hasMundane) weight += 2 - curve * 0.6;
      if (hasAmbiguous) weight += 0.8 + curve * 1.2;
      if (hasHazard) weight += 0.2 + curve * 0.8;
      if (hasInternal) weight += 0.35 + curve * 0.9;
      if (hasShock) weight += day <= 3 ? 0.03 : 0.1 + curve * 0.3;
    } else {
      if (hasMundane) weight += 2.5 - curve * 0.4;
      if (hasAmbiguous) weight += 0.35 + curve * 0.55;
      if (hasHazard) weight += 0.08 + curve * 0.3;
      if (hasInternal) weight += 0.15 + curve * 0.3;
      if (hasShock) weight += day <= 4 ? 0.02 : 0.06 + curve * 0.18;
    }
  } else {
    if (threatSeed === ThreatSeed.REAL) {
      if (hasMundane) weight += 1.9 - curve * 0.4;
      if (hasInternal) weight += 0.7 + curve * 1;
      if (hasAmbiguous) weight += 0.45 + curve * 0.7;
      if (hasHazard) weight += 0.25 + curve * 0.8;
      if (hasShock) weight += day <= 3 ? 0.03 : 0.1 + curve * 0.35;
    } else if (threatSeed === ThreatSeed.EXAGGERATED) {
      if (hasMundane) weight += 1.8 - curve * 0.35;
      if (hasInternal) weight += 0.95 + curve * 1.25;
      if (hasAmbiguous) weight += 0.65 + curve * 0.95;
      if (hasHazard) weight += 0.2 + curve * 0.65;
      if (hasShock) weight += day <= 3 ? 0.03 : 0.09 + curve * 0.3;
    } else {
      if (hasMundane) weight += 2.3 - curve * 0.2;
      if (hasInternal) weight += 0.35 + curve * 0.35;
      if (hasAmbiguous) weight += 0.25 + curve * 0.4;
      if (hasHazard) weight += 0.08 + curve * 0.2;
      if (hasShock) weight += day <= 4 ? 0.02 : 0.05 + curve * 0.15;
    }
  }

  if (veryEarly && isIntenseEvent(card)) {
    weight *= 0.7;
  }

  if (investigationActive && (hasHazard || hasAmbiguous || hasShock)) {
    weight += 1.6;
  }

  if (intenseStreak >= 1 && hasShock) {
    weight *= 0.35;
  }
  if (intenseStreak >= 2 && isIntenseEvent(card)) {
    weight *= 0.08;
  }
  if (intenseStreak >= 2 && hasMundane) {
    weight *= 2.8;
  }

  return Math.max(0.05, Number(weight.toFixed(3)));
}

function applyPacingPool(cards: NightEventCard[], intenseStreak: number): NightEventCard[] {
  if (intenseStreak < 2) {
    return cards;
  }

  const coolDownPool = cards.filter((card) => !isIntenseEvent(card) || card.tags.includes("mundane"));
  return coolDownPool.length > 0 ? coolDownPool : cards;
}

function distortionLevelForSanity(sanity: number): NightScene["distortionLevel"] {
  if (sanity < 25) {
    return "SEVERE";
  }
  if (sanity < 45) {
    return "UNEASY";
  }
  return "NONE";
}

function distortOutcomeText(
  outcome: string,
  level: NightScene["distortionLevel"],
  rng: ReturnType<typeof createSeededRng>
): string {
  if (level === "NONE") {
    return outcome;
  }

  const uneasySuffix = rng.pick([
    "The silence around it lingers too long.",
    "The detail sits wrong in your mind.",
    "It feels less resolved than the words suggest.",
  ]);
  if (level === "UNEASY") {
    return `${outcome} ${uneasySuffix}`;
  }

  const severeSuffix = rng.pick([
    "Every shadow seems to repeat the scene.",
    "For a moment you doubt what happened first.",
    "The memory plays back with missing pieces.",
  ]);
  return `${outcome} ${severeSuffix}`;
}

function distortRouteText(
  route: string | null,
  level: NightScene["distortionLevel"],
  rng: ReturnType<typeof createSeededRng>
): string | null {
  if (!route || level === "NONE") {
    return route;
  }

  if (level === "UNEASY") {
    const prefix = rng.pick([
      "The path feels narrower than it is.",
      "Markers look misplaced in the dark.",
      "Your map memory stutters on this stretch.",
    ]);
    return `${route} ${prefix}`;
  }

  const prefix = rng.pick([
    "You could swear this bend was not here before.",
    "For several steps, every trail points at you.",
    "The marker lights seem to move when you blink.",
  ]);
  return `${route} ${prefix}`;
}

function falsePerceptionOverlay(
  level: NightScene["distortionLevel"],
  rng: ReturnType<typeof createSeededRng>
): string | null {
  if (level === "NONE") {
    return null;
  }

  const roll = rng.nextFloat();
  if (level === "UNEASY" && roll < 0.26) {
    return rng.pick(SANITY_OVERLAY_LINES);
  }
  if (level === "SEVERE" && roll < 0.6) {
    return rng.pick(SANITY_OVERLAY_LINES);
  }
  return null;
}

function debriefTruthForThreat(
  rng: ReturnType<typeof createSeededRng>,
  threatSeed: ThreatSeed,
  day: number,
  calmNight: boolean
): string {
  const curve = threatEscalationCurve(day);
  if (calmNight) {
    if (threatSeed === ThreatSeed.REAL) {
      return rng.weightedPick<string>([
        { value: "nothing unusual", weight: 5.2 - curve * 0.8 },
        { value: "tracks in snow", weight: 1.4 + curve * 0.5 },
        { value: "distant light", weight: 1.1 + curve * 0.35 },
        { value: "howl", weight: 0.9 + curve * 0.25 },
        { value: "strange symbol", weight: 0.8 + curve * 0.3 },
        { value: "missing man", weight: 0.55 + curve * 0.15 },
      ]);
    }
    if (threatSeed === ThreatSeed.EXAGGERATED) {
      return rng.weightedPick<string>([
        { value: "nothing unusual", weight: 6.4 - curve * 0.3 },
        { value: "tracks in snow", weight: 0.95 + curve * 0.2 },
        { value: "distant light", weight: 0.9 + curve * 0.15 },
        { value: "howl", weight: 0.65 + curve * 0.1 },
        { value: "strange symbol", weight: 0.6 + curve * 0.1 },
        { value: "missing man", weight: 0.45 + curve * 0.05 },
      ]);
    }
    return rng.weightedPick<string>([
      { value: "nothing unusual", weight: 7.2 - curve * 0.2 },
      { value: "tracks in snow", weight: 0.8 + curve * 0.1 },
      { value: "distant light", weight: 0.75 + curve * 0.08 },
      { value: "howl", weight: 0.6 + curve * 0.08 },
      { value: "strange symbol", weight: 0.55 + curve * 0.05 },
      { value: "missing man", weight: 0.35 + curve * 0.04 },
    ]);
  }

  if (threatSeed === ThreatSeed.REAL) {
    return rng.weightedPick<string>([
      { value: "missing man", weight: 2 + curve * 2.1 },
      { value: "tracks in snow", weight: 2.4 + curve * 1.8 },
      { value: "distant light", weight: 1.8 + curve * 1.4 },
      { value: "howl", weight: 1.6 + curve * 1.2 },
      { value: "strange symbol", weight: 1.4 + curve * 1.5 },
      { value: "nothing unusual", weight: 1.3 - curve * 0.7 },
    ]);
  }
  if (threatSeed === ThreatSeed.EXAGGERATED) {
    return rng.weightedPick<string>([
      { value: "nothing unusual", weight: 3.3 - curve * 0.6 },
      { value: "tracks in snow", weight: 1.8 + curve * 0.3 },
      { value: "distant light", weight: 1.6 + curve * 0.3 },
      { value: "howl", weight: 1 + curve * 0.2 },
      { value: "strange symbol", weight: 1 + curve * 0.2 },
      { value: "missing man", weight: 0.9 + curve * 0.1 },
    ]);
  }
  return rng.weightedPick<string>([
    { value: "nothing unusual", weight: 5.5 - curve * 0.5 },
    { value: "tracks in snow", weight: 1 + curve * 0.15 },
    { value: "distant light", weight: 1 + curve * 0.1 },
    { value: "howl", weight: 0.9 + curve * 0.1 },
    { value: "strange symbol", weight: 0.8 + curve * 0.15 },
    { value: "missing man", weight: 0.7 + curve * 0.1 },
  ]);
}

function distortedClaimForNpc(
  rng: ReturnType<typeof createSeededRng>,
  truth: string,
  npc: NPCProfile,
  threatSeed: ThreatSeed
): string {
  const alarmingBias = npc.fear + npc.belief;
  const pool = DEBRIEF_CLAIMS.filter((claim) => claim !== truth);
  if (pool.length === 0) {
    return truth;
  }

  if (threatSeed === ThreatSeed.EXAGGERATED || alarmingBias > 120) {
    return rng.weightedPick<string>(
      pool.map((claim) => ({
        value: claim,
        weight: ALARMING_DEBRIEF_CLAIMS.includes(claim as (typeof ALARMING_DEBRIEF_CLAIMS)[number])
          ? 3
          : 1,
      }))
    );
  }

  return rng.pick(pool);
}

function claimToPresentation(
  claim: string,
  sanity: number,
  rng: ReturnType<typeof createSeededRng>
): string {
  if (sanity >= 35) {
    return claim;
  }

  if (claim === "nothing unusual") {
    return sanity < 22
      ? "nothing unusual, though the silence felt wrong"
      : "nothing unusual, but the quiet rang in your ears";
  }

  const prefix = rng.pick([
    "through the dark",
    "under the wind",
    "between lantern cuts",
    "past the frozen markers",
  ]);
  return `${prefix}: ${claim}`;
}

function emotionForReport(
  rng: ReturnType<typeof createSeededRng>,
  npc: NPCProfile,
  claim: string
): ReportEmotion {
  if (claim !== "nothing unusual" && npc.fear > 60) {
    return rng.pick(["ANXIOUS", "PANICKED"]);
  }
  if (npc.belief > 65) {
    return rng.pick(["ANXIOUS", "DEFIANT"]);
  }
  return rng.pick(["STEADY", "ANXIOUS", "DEFIANT"]);
}

function hasConflictingClaims(reports: PatrolReport[]): boolean {
  const claims = reports.map((report) => report.claimedObservations[0] ?? "nothing unusual");
  return claims.includes("nothing unusual") && claims.some((claim) => claim !== "nothing unusual");
}

function makeCampDebriefReports(state: GameState, day: number, eventCard: NightEventCard): PatrolReport[] {
  const truthRng = createSeededRng(`${state.seed}:week:${state.week}:day:${day}:camp-debrief`);
  const pool = [...state.npcProfiles];
  const count = Math.min(pool.length, truthRng.nextInt(2, 4));
  const reports: PatrolReport[] = [];
  const curve = threatEscalationCurve(day);
  const calmNight = isCalmEvent(eventCard);

  for (let i = 0; i < count; i += 1) {
    const npc = truthRng.pick(pool);
    const npcIndex = pool.findIndex((entry) => entry.id === npc.id);
    if (npcIndex >= 0) {
      pool.splice(npcIndex, 1);
    }

    const truth = debriefTruthForThreat(truthRng, state.hidden.threatSeed, day, calmNight);
    const threatLieBase =
      state.hidden.threatSeed === ThreatSeed.REAL
        ? 0.09
        : state.hidden.threatSeed === ThreatSeed.EXAGGERATED
          ? 0.2
          : 0.05;
    const threatMistakeBase =
      state.hidden.threatSeed === ThreatSeed.REAL
        ? 0.16
        : state.hidden.threatSeed === ThreatSeed.EXAGGERATED
          ? 0.3
          : 0.12;

    const lieChance = clamp(
      threatLieBase +
        (100 - npc.trustInPlayer) / 310 +
        npc.belief / 620 +
        curve * 0.05 -
        (calmNight ? 0.05 : 0),
      0.03,
      0.74
    );
    const mistakeChance = clamp(
      threatMistakeBase +
        npc.fear / 230 +
        npc.belief / 360 -
        npc.loyalty / 620 +
        curve * 0.08 -
        (calmNight ? 0.08 : 0),
      0.06,
      0.9
    );

    const roll = truthRng.nextFloat();
    const isLying = roll < lieChance;
    const isMistaken = !isLying && roll < lieChance + mistakeChance;

    const claim =
      isLying || isMistaken
        ? distortedClaimForNpc(truthRng, truth, npc, state.hidden.threatSeed)
        : truth;

    const confidence = Number(
      clamp((npc.loyalty + npc.trustInPlayer) / 220 + truthRng.nextFloat() * 0.25, 0.1, 0.98).toFixed(2)
    );

    const presentationRng = createSeededRng(
      `${state.seed}:week:${state.week}:day:${day}:camp-debrief:presentation:${npc.id}`
    );

    reports.push({
      npcId: npc.id,
      npcName: npc.name,
      claimedObservations: [claim],
      truthObservation: truth,
      presentedClaim: claimToPresentation(claim, state.playerStats.sanity, presentationRng),
      confidence,
      emotion: emotionForReport(truthRng, npc, claim),
      isLying,
    });
  }

  if (!calmNight && reports.length > 1 && !hasConflictingClaims(reports) && truthRng.nextFloat() < 0.7) {
    const target = truthRng.pick(reports);
    const forcedClaim =
      target.claimedObservations[0] === "nothing unusual"
        ? truthRng.pick(ALARMING_DEBRIEF_CLAIMS)
        : "nothing unusual";
    target.claimedObservations = [forcedClaim];
    const forcedPresentationRng = createSeededRng(
      `${state.seed}:week:${state.week}:day:${day}:camp-debrief:presentation:${target.npcId}:forced`
    );
    target.presentedClaim = claimToPresentation(
      forcedClaim,
      state.playerStats.sanity,
      forcedPresentationRng
    );
    target.isLying = forcedClaim !== target.truthObservation;
  }

  if (calmNight && reports.length > 0 && !reports.some((report) => report.claimedObservations[0] === "nothing unusual")) {
    const calmTarget = [...reports].sort((a, b) => b.confidence - a.confidence)[0];
    if (calmTarget) {
      calmTarget.claimedObservations = ["nothing unusual"];
      const calmPresentationRng = createSeededRng(
        `${state.seed}:week:${state.week}:day:${day}:camp-debrief:presentation:${calmTarget.npcId}:calm-fallback`
      );
      calmTarget.presentedClaim = claimToPresentation(
        "nothing unusual",
        state.playerStats.sanity,
        calmPresentationRng
      );
      calmTarget.isLying = calmTarget.truthObservation !== "nothing unusual";
    }
  }

  return reports;
}

function makePatrolFieldReports(state: GameState, day: number, observationPool: string[]): PatrolReport[] {
  const truthRng = createSeededRng(`${state.seed}:week:${state.week}:day:${day}:patrol-field-reports`);
  const pool = [...state.npcProfiles];
  const count = Math.min(pool.length, truthRng.nextInt(2, 3));
  const reports: PatrolReport[] = [];
  const curve = threatEscalationCurve(day);
  const threatLieBase =
    state.hidden.threatSeed === ThreatSeed.REAL
      ? 0.05
      : state.hidden.threatSeed === ThreatSeed.EXAGGERATED
        ? 0.15
        : 0.03;
  const threatMistakeBase =
    state.hidden.threatSeed === ThreatSeed.REAL
      ? 0.11
      : state.hidden.threatSeed === ThreatSeed.EXAGGERATED
        ? 0.2
        : 0.08;

  for (let i = 0; i < count; i += 1) {
    const npc = truthRng.pick(pool);
    const npcIndex = pool.findIndex((entry) => entry.id === npc.id);
    if (npcIndex >= 0) {
      pool.splice(npcIndex, 1);
    }
    const truth = truthRng.pick(observationPool);
    const lieChance = clamp(
      threatLieBase + (100 - npc.trustInPlayer) / 360 + npc.belief / 700 + curve * 0.04,
      0.02,
      0.58
    );
    const mistakeChance = clamp(
      threatMistakeBase + npc.fear / 280 + npc.belief / 460 - npc.loyalty / 700 + curve * 0.05,
      0.04,
      0.72
    );
    const roll = truthRng.nextFloat();
    const isLying = roll < lieChance;
    const isMistaken = !isLying && roll < lieChance + mistakeChance;
    const claim =
      isLying || isMistaken
        ? distortedClaimForNpc(truthRng, truth, npc, state.hidden.threatSeed)
        : truth;
    const presentationRng = createSeededRng(
      `${state.seed}:week:${state.week}:day:${day}:patrol-field-reports:presentation:${npc.id}`
    );
    reports.push({
      npcId: npc.id,
      npcName: npc.name,
      claimedObservations: [claim],
      truthObservation: truth,
      presentedClaim: claimToPresentation(claim, state.playerStats.sanity, presentationRng),
      confidence: Number(clamp(0.5 + truthRng.nextFloat() * 0.4, 0.2, 0.95).toFixed(2)),
      emotion: truthRng.pick(["STEADY", "ANXIOUS", "DEFIANT"]),
      isLying,
    });
  }

  return reports;
}

function summarizeFlags(reports: PatrolReport[], assignment: DayAssignment): string[] {
  const flags: string[] = [];
  const lies = reports.filter((report) => report.isLying).length;
  if (lies > 0) {
    flags.push("POTENTIAL_FALSE_REPORT");
  }
  if (hasConflictingClaims(reports)) {
    flags.push("CONFLICTING_TESTIMONY");
  }
  const avgConfidence =
    reports.reduce((total, report) => total + report.confidence, 0) / Math.max(reports.length, 1);
  if (avgConfidence < 0.45) {
    flags.push("LOW_CONFIDENCE");
  }
  if (assignment.disruption.extraDuty === "NIGHT_WATCH") {
    flags.push("EXTRA_DUTY_APPLIED");
  }
  return flags;
}

function buildRumorPackets(
  reports: PatrolReport[],
  day: number,
  choiceId: DebriefChoiceId | null
): RumorPacket[] {
  return reports.map((report, index) => {
    const claim = report.claimedObservations[0] ?? "nothing unusual";
    const alarming = claim !== "nothing unusual";
    const choiceBias =
      choiceId === "ESCALATE_COMMANDER"
        ? 0.12
        : choiceId === "DOWNPLAY"
          ? -0.18
          : choiceId === "ACCUSE_LIAR"
            ? 0.1
            : 0;
    const intensity = clamp(
      0.18 + (alarming ? 0.26 : -0.08) + report.confidence * 0.3 + choiceBias,
      0.04,
      0.98
    );
    return {
      id: `rumor-${day}-${report.npcId}-${index + 1}`,
      day,
      sourceNpcId: report.npcId,
      claim,
      truth: report.truthObservation,
      intensity: Number(intensity.toFixed(2)),
      adoptedBy: [],
    };
  });
}

function propagateRumors(
  state: GameState,
  day: number,
  packets: RumorPacket[],
  choiceId: DebriefChoiceId | null
): {
  packets: RumorPacket[];
  rumorReachCount: number;
  campDelta: Partial<CampStats>;
  rumorAdoption: GameState["hidden"]["rumorAdoption"];
} {
  const rng = createSeededRng(`${state.seed}:week:${state.week}:day:${day}:rumor-propagation`);
  const nextAdoption = { ...state.hidden.rumorAdoption };
  const reached = new Set<string>();
  const nextPackets: RumorPacket[] = [];

  const choiceSpreadMod =
    choiceId === "ESCALATE_COMMANDER"
      ? 0.08
      : choiceId === "DOWNPLAY"
        ? -0.16
        : choiceId === "ACCUSE_LIAR"
          ? 0.11
          : 0;

  const ensureRumorNode = (npcId: string) => {
    if (!nextAdoption[npcId]) {
      nextAdoption[npcId] = {
        adopted: false,
        heardCount: 0,
        spreadCount: 0,
        lastHeardDay: null,
      };
    }
    return nextAdoption[npcId];
  };

  for (const packet of packets) {
    const adoptedBy = new Set<string>([packet.sourceNpcId]);
    const sourceNode = ensureRumorNode(packet.sourceNpcId);
    sourceNode.adopted = true;
    sourceNode.heardCount += 1;
    sourceNode.spreadCount += 1;
    sourceNode.lastHeardDay = day;
    reached.add(packet.sourceNpcId);

    for (const npc of state.npcProfiles) {
      if (npc.id === packet.sourceNpcId) {
        continue;
      }

      const node = ensureRumorNode(npc.id);
      const chance = clamp(
        packet.intensity * 0.55 +
          npc.fear / 260 +
          npc.belief / 300 +
          (node.adopted ? 0.08 : 0) +
          choiceSpreadMod -
          state.campStats.discipline / 320,
        0.03,
        0.93
      );

      if (rng.nextFloat() < chance) {
        adoptedBy.add(npc.id);
        reached.add(npc.id);
        node.adopted = true;
        node.heardCount += 1;
        node.lastHeardDay = day;
        if (rng.nextFloat() < clamp(0.2 + npc.belief / 260, 0.15, 0.78)) {
          node.spreadCount += 1;
        }
      }
    }

    nextPackets.push({
      ...packet,
      adoptedBy: [...adoptedBy],
    });
  }

  const rumorReachCount = reached.size;
  const reachRatio = rumorReachCount / Math.max(state.npcProfiles.length, 1);
  const spreadDelta: Partial<CampStats> = {
    rumor: Math.max(0, Math.round(reachRatio * 7)),
    morale: reachRatio > 0.55 ? -1 : 0,
    discipline: choiceId === "ESCALATE_COMMANDER" ? 0 : reachRatio > 0.72 ? -1 : 0,
  };

  return {
    packets: nextPackets,
    rumorReachCount,
    campDelta: spreadDelta,
    rumorAdoption: nextAdoption,
  };
}

function applyAccuseLiarTrustShift(
  state: GameState,
  reports: PatrolReport[]
): {
  npcProfiles: NPCProfile[];
  targetedNpcName: string | null;
} {
  if (reports.length === 0) {
    return { npcProfiles: state.npcProfiles, targetedNpcName: null };
  }

  const targetReport =
    [...reports]
      .filter((entry) => entry.claimedObservations[0] !== entry.truthObservation)
      .sort((a, b) => a.confidence - b.confidence)[0] ??
    [...reports].sort((a, b) => a.confidence - b.confidence)[0];

  const targetId = targetReport?.npcId;
  if (!targetId) {
    return { npcProfiles: state.npcProfiles, targetedNpcName: null };
  }

  let targetedNpcName: string | null = null;
  const nextProfiles = state.npcProfiles.map((npc) => {
    if (npc.id === targetId) {
      targetedNpcName = npc.name;
      return {
        ...npc,
        trustInPlayer: clamp(npc.trustInPlayer - 14, 0, 100),
        loyalty: clamp(npc.loyalty - 8, 0, 100),
        fear: clamp(npc.fear + 6, 0, 100),
      };
    }

    if (reports.some((entry) => entry.npcId === npc.id && entry.claimedObservations[0] === entry.truthObservation)) {
      return {
        ...npc,
        trustInPlayer: clamp(npc.trustInPlayer + 2, 0, 100),
      };
    }

    return npc;
  });

  return { npcProfiles: nextProfiles, targetedNpcName };
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function buildDawnSummary(deltas: DawnReport["deltas"], rumorReachCount: number): string {
  const keyChanges = [
    `Supplies ${formatSigned(deltas.supplies)}`,
    `Morale ${formatSigned(deltas.morale)}`,
    `Discipline ${formatSigned(deltas.discipline)}`,
    `Rumor ${formatSigned(deltas.rumor)}`,
    `Warmth ${formatSigned(deltas.warmth)}`,
    `Stamina ${formatSigned(deltas.stamina)}`,
    `Sanity ${formatSigned(deltas.sanity)}`,
    `Injury ${formatSigned(deltas.injury)}`,
    `Rumor reach ${rumorReachCount}`,
  ];
  return `Dawn tally: ${keyChanges.join(", ")}.`;
}

function createDawnReport(
  day: number,
  playerDelta: Partial<PlayerStats>,
  campDelta: Partial<CampStats>,
  rumorReachCount: number
): DawnReport {
  const deltas = {
    supplies: campDelta.supplies ?? 0,
    morale: campDelta.morale ?? 0,
    discipline: campDelta.discipline ?? 0,
    rumor: campDelta.rumor ?? 0,
    warmth: playerDelta.warmth ?? 0,
    stamina: playerDelta.stamina ?? 0,
    sanity: playerDelta.sanity ?? 0,
    injury: playerDelta.injury ?? 0,
  };

  return {
    day,
    title: `Dawn Report - Day ${day}`,
    summary: buildDawnSummary(deltas, rumorReachCount),
    rumorReachCount,
    deltas,
  };
}

function detectFirstBreak(state: GameState): { label: string; day: number | null } {
  let player = { ...BASE_PLAYER_STATS };
  let camp = { ...BASE_CAMP_STATS };

  const orderedLogs = [...state.nightLogs].sort((a, b) => a.day - b.day);
  for (const log of orderedLogs) {
    player = applyPlayerDelta(player, log.deltas.player);
    camp = applyCampDelta(camp, log.deltas.camp);

    if (camp.morale <= 35) {
      return { label: "Morale collapsed first", day: log.day };
    }
    if (camp.discipline <= 35) {
      return { label: "Discipline cracked first", day: log.day };
    }
    if (camp.rumor >= 65) {
      return { label: "Rumor pressure broke containment first", day: log.day };
    }
    if (player.sanity <= 30) {
      return { label: "Sanity erosion broke your judgment first", day: log.day };
    }
    if (camp.supplies <= 30) {
      return { label: "Supply strain broke the line first", day: log.day };
    }
    if (player.injury >= 25) {
      return { label: "Injury load broke patrol capacity first", day: log.day };
    }
  }

  return { label: "No single collapse trigger fired before week end", day: null };
}

function buildWeekShareText(state: GameState, firstBreakLabel: string): string {
  const indicators = [
    `morale ${state.campStats.morale <= 35 ? "LOW" : "steady"} (${state.campStats.morale})`,
    `discipline ${state.campStats.discipline <= 35 ? "LOW" : "steady"} (${state.campStats.discipline})`,
    `rumor ${state.campStats.rumor >= 65 ? "HIGH" : "contained"} (${state.campStats.rumor})`,
  ];

  return [
    `Lowborn Week ${state.week} Summary`,
    `Seed: ${state.seed}`,
    `Nights survived: ${state.nightLogs.length}/7`,
    `Collapse indicators: ${indicators.join(", ")}`,
    `What broke first: ${firstBreakLabel}`,
    `Final camp -> supplies ${state.campStats.supplies}, morale ${state.campStats.morale}, discipline ${state.campStats.discipline}, rumor ${state.campStats.rumor}`,
    `Final player -> warmth ${state.playerStats.warmth}, stamina ${state.playerStats.stamina}, sanity ${state.playerStats.sanity}, injury ${state.playerStats.injury}`,
  ].join("\n");
}

export function buildWeekSummary(state: GameState): WeekSummary {
  const firstBreak = detectFirstBreak(state);
  const firstBreakLabel = firstBreak.day
    ? `${firstBreak.label} on Day ${firstBreak.day}`
    : firstBreak.label;

  return {
    week: state.week,
    nightsSurvived: state.nightLogs.length,
    collapseIndicators: {
      moraleLow: state.campStats.morale <= 35,
      disciplineLow: state.campStats.discipline <= 35,
      rumorHigh: state.campStats.rumor >= 65,
    },
    firstBreakLabel,
    shareText: buildWeekShareText(state, firstBreakLabel),
  };
}

function weightedPickEventCard(
  rng: ReturnType<typeof createSeededRng>,
  cards: NightEventCard[],
  sceneType: NightScene["sceneType"],
  threatSeed: ThreatSeed,
  day: number,
  investigationActive: boolean,
  intenseStreak: number
): NightEventCard {
  const pacedPool = applyPacingPool(cards, intenseStreak);
  return rng.weightedPick(
    pacedPool.map((card) => ({
      value: card,
      weight: eventWeightForThreat(
        card,
        sceneType,
        threatSeed,
        day,
        investigationActive,
        intenseStreak
      ),
    }))
  );
}

function buildNightScene(state: GameState): NightScene | null {
  const today = state.schedule[state.todayIndex];
  if (!today) {
    return null;
  }

  const sceneType = today.assignedDuty === "PATROL" ? "PATROL" : "CAMP";
  const investigationActive = sceneType === "PATROL" && state.hidden.investigationFocus > 0;
  const rng = createSeededRng(`${state.seed}:week:${state.week}:day:${today.day}:night-scene`);
  const eventPool = nightEventCards.filter((card) => card.sceneType === sceneType);
  if (eventPool.length === 0) {
    return null;
  }

  const eventCard = weightedPickEventCard(
    rng,
    eventPool,
    sceneType,
    state.hidden.threatSeed,
    today.day,
    investigationActive,
    state.hidden.intenseStreak
  );
  const routeDescription =
    sceneType === "PATROL"
      ? `${rng.pick(eventCard.routeTemplates)} ${rng.pick(PATROL_ROUTE_SUFFIXES)}`
      : null;

  const distortionSeedRng = createSeededRng(
    `${state.seed}:week:${state.week}:day:${today.day}:scene-presentation`
  );
  const distortionLevel = distortionLevelForSanity(state.playerStats.sanity);
  const presentedRouteDescription = distortRouteText(
    routeDescription,
    distortionLevel,
    distortionSeedRng
  );
  const presentedOutcome = distortOutcomeText(
    eventCard.outcome,
    distortionLevel,
    distortionSeedRng
  );
  const overlay = falsePerceptionOverlay(distortionLevel, distortionSeedRng);

  const debriefReports =
    sceneType === "CAMP" ? makeCampDebriefReports(state, today.day, eventCard) : [];

  return {
    sceneType,
    day: today.day,
    assignmentDuty: today.assignedDuty,
    routeDescription,
    presentedRouteDescription,
    eventCard,
    presentedOutcome,
    falsePerceptionOverlay: overlay,
    distortionLevel,
    investigationActive,
    debriefReports,
    choices: sceneType === "PATROL" ? buildPatrolChoices(eventCard.tags) : buildCampChoices(),
  };
}

function withTodayDisruption(state: GameState, index: number): WeekSchedule {
  const schedule = state.schedule.map((entry, entryIndex) => {
    if (entryIndex !== index) {
      return entry;
    }
    return applyDailyDisruption(
      {
        ...entry,
        assignedDuty: entry.scheduledDuty,
        assignedShift: entry.scheduledShift,
        disruption: makeNoDisruption(0),
        resolved: false,
        eventTitle: null,
        summary: null,
      },
      state.seed,
      state.week
    );
  });
  return toWeekSchedule(schedule);
}

function initializeRumorNetwork(npcProfiles: NPCProfile[]): GameState["hidden"]["rumorAdoption"] {
  const rumorAdoption: GameState["hidden"]["rumorAdoption"] = {};
  for (const npc of npcProfiles) {
    rumorAdoption[npc.id] = {
      adopted: false,
      heardCount: 0,
      spreadCount: 0,
      lastHeardDay: null,
    };
  }
  return rumorAdoption;
}

export function generateWeekSchedule(seed: string, week: number = 1): WeekSchedule {
  const rng = createSeededRng(`${seed}:week:${week}:schedule`);
  const patrolTarget = rng.nextInt(1, 3);

  const availableDays = [0, 1, 2, 3, 4, 5, 6];
  const patrolDays = new Set<number>();
  while (patrolDays.size < patrolTarget) {
    patrolDays.add(rng.pick(availableDays));
  }

  const assignments = DAY_LABELS.map((label, index) => {
    const scheduledDuty: DutyType = patrolDays.has(index)
      ? "PATROL"
      : rng.weightedPick([
          { value: "CAMP_WORK" as const, weight: 4 },
          { value: "CAMP_WAIT" as const, weight: 3 },
          { value: "NIGHT_WATCH" as const, weight: 1 },
          { value: "REST" as const, weight: 2 },
        ]);
    const scheduledShift = shiftForDuty(
      scheduledDuty,
      `${seed}:week:${week}:day:${index + 1}:shift`
    );

    return {
      day: index + 1,
      label,
      scheduledDuty,
      scheduledShift,
      assignedDuty: scheduledDuty,
      assignedShift: scheduledShift,
      disruption: makeNoDisruption(0),
      resolved: false,
      eventTitle: null,
      summary: null,
    };
  });

  return toWeekSchedule(assignments);
}

export function applyDailyDisruption(
  assignment: DayAssignment,
  seed: string,
  week: number
): DayAssignment {
  const chanceRng = createSeededRng(`${seed}:week:${week}:day:${assignment.day}:disruption-chance`);
  const chance = Number((0.25 + chanceRng.nextFloat() * 0.15).toFixed(3));
  const disruptionPlan = buildWeeklyDisruptionPlan(seed, week);
  if (!disruptionPlan.has(assignment.day)) {
    return {
      ...assignment,
      assignedDuty: assignment.scheduledDuty,
      assignedShift: assignment.scheduledShift,
      disruption: makeNoDisruption(chance),
    };
  }

  const rng = createSeededRng(`${seed}:week:${week}:day:${assignment.day}:disruption-effect`);
  const type = pickDisruptionType(assignment, rng);

  if (type === "FILL_IN_PATROL") {
    return {
      ...assignment,
      assignedDuty: "PATROL",
      assignedShift: shiftForDuty("PATROL", `${seed}:week:${week}:day:${assignment.day}:fillin-shift`),
      disruption: {
        type,
        chance,
        reason: "Short roster on the perimeter. You were reassigned to patrol.",
        extraDuty: null,
      },
    };
  }

  if (type === "SWAP") {
    const swappedDuty = swapDuty(
      assignment.scheduledDuty,
      `${seed}:week:${week}:day:${assignment.day}:swap-duty`
    );
    return {
      ...assignment,
      assignedDuty: swappedDuty,
      assignedShift: shiftForDuty(swappedDuty, `${seed}:week:${week}:day:${assignment.day}:swap-shift`),
      disruption: {
        type,
        chance,
        reason:
          assignment.scheduledDuty === "PATROL"
            ? "Command swapped your patrol slot for camp support."
            : "Command pulled you into patrol due to a late gap.",
        extraDuty: null,
      },
    };
  }

  return {
    ...assignment,
    assignedDuty: assignment.scheduledDuty,
    assignedShift: assignment.scheduledShift,
    disruption: {
      type: "EXTRA_DUTY",
      chance,
      reason: "Emergency watch expansion. Extra NIGHT_WATCH assigned.",
      extraDuty: "NIGHT_WATCH",
    },
  };
}

export function pickThreatSeed(seed: string): ThreatSeed {
  const rng = createSeededRng(`${seed}:threat-seed`);
  return rng.weightedPick<ThreatSeed>([
    { value: ThreatSeed.REAL, weight: 5 },
    { value: ThreatSeed.EXAGGERATED, weight: 3 },
    { value: ThreatSeed.NONE, weight: 2 },
  ]);
}

export function buildNpcProfiles(seed: string): NPCProfile[] {
  const rng = createSeededRng(`${seed}:npcs`);
  const rosterSize = rng.nextInt(8, 14);
  const availableNames = [...frontierNames];
  const roster: NPCProfile[] = [];

  for (let index = 0; index < rosterSize; index += 1) {
    const roleTemplate = rng.pick(npcTemplates);
    const baseName = availableNames.length > 0 ? availableNames.splice(rng.nextInt(0, availableNames.length - 1), 1)[0]! : rng.pick(frontierNames);
    const fallbackTag = index >= frontierNames.length ? `-${index + 1}` : "";

    roster.push({
      id: `npc-${index + 1}`,
      name: `${baseName}${fallbackTag}`,
      loyalty: rng.nextInt(30, 85),
      fear: rng.nextInt(10, 80),
      belief: rng.nextInt(15, 90),
      trustInPlayer: rng.nextInt(25, 80),
      role: roleTemplate.role,
    });
  }

  return roster;
}

export function createInitialGameState(seedInput?: string): GameState {
  const seed = (seedInput?.trim() || DEFAULT_SEED).toLowerCase();
  const npcProfiles = buildNpcProfiles(seed);
  let schedule = generateWeekSchedule(seed, 1);
  schedule = toWeekSchedule(
    schedule.map((entry, index) => (index === 0 ? applyDailyDisruption(entry, seed, 1) : entry))
  );
  const today = schedule[0]!;

  const nextState: GameState = {
    seed,
    week: 1,
    todayIndex: 0,
    schedule,
    phase: "DAY",
    activeNightScene: null,
    dawnReport: null,
    playerStats: { ...BASE_PLAYER_STATS },
    campStats: { ...BASE_CAMP_STATS },
    npcProfiles,
    nightLogs: [],
    recentEvents: [
      `Week 1 initialized with seed "${seed}".`,
      `Schedule posted with ${schedule.filter((entry) => entry.scheduledDuty === "PATROL").length} patrol day(s).`,
      `Roster assembled: ${npcProfiles.length} watchers assigned.`,
    ],
    todaySummary: daySummary(today),
    weekSummary: null,
    complete: false,
    hidden: {
      threatSeed: pickThreatSeed(seed),
      investigationFocus: 0,
      intenseStreak: 0,
      pendingAccusationConflict: false,
      rumorAdoption: initializeRumorNetwork(npcProfiles),
      lastDebrief: null,
    },
  };

  return gameStateSchema.parse(nextState);
}

export function beginNight(state: GameState): GameState {
  if (state.complete || state.phase !== "DAY") {
    return state;
  }

  const today = state.schedule[state.todayIndex];
  if (!today) {
    return gameStateSchema.parse({
      ...state,
      complete: true,
      todaySummary: "No further assignments available.",
    });
  }

  const activeNightScene = buildNightScene(state);
  if (!activeNightScene) {
    return state;
  }

  const nextState: GameState = {
    ...state,
    phase: "NIGHT_SCENE",
    activeNightScene,
    dawnReport: null,
    todaySummary:
      activeNightScene.sceneType === "PATROL"
        ? "Patrol scene active. Make one decision to resolve the night."
        : "Camp scene active. Patrols are returning for debrief.",
    recentEvents: [
      ...state.recentEvents,
      `${today.label}: Night began (${activeNightScene.sceneType}).`,
      `Event: ${activeNightScene.eventCard.title}.`,
    ].slice(-120),
  };

  return gameStateSchema.parse(nextState);
}

export function resolveNightScene(state: GameState, choiceId?: string): GameState {
  if (state.complete || state.phase !== "NIGHT_SCENE" || !state.activeNightScene) {
    return state;
  }

  const today = state.schedule[state.todayIndex];
  if (!today) {
    return gameStateSchema.parse({
      ...state,
      phase: "DAY",
      activeNightScene: null,
      dawnReport: null,
      complete: true,
      todaySummary: "No further assignments available.",
    });
  }

  const scene = state.activeNightScene;
  const selectedChoice = scene.choices.find((option) => option.id === choiceId) ?? scene.choices[0];
  if (!selectedChoice) {
    return state;
  }

  const debriefChoiceId =
    scene.sceneType === "CAMP" ? (selectedChoice.id as DebriefChoiceId) : null;

  const threatMod = threatModifierForEvent(state.hidden.threatSeed, scene.eventCard, today.day);
  const extraDutyPenalty: Partial<PlayerStats> =
    today.disruption.extraDuty === "NIGHT_WATCH" ? { sanity: -3, stamina: -2, warmth: -1 } : {};
  const extraCampPenalty: Partial<CampStats> =
    today.disruption.extraDuty === "NIGHT_WATCH" ? { rumor: 1 } : {};

  const investigationPenalty: Partial<PlayerStats> =
    scene.sceneType === "PATROL" && scene.investigationActive ? { stamina: -1, sanity: -1 } : {};
  const investigationCampEffect: Partial<CampStats> =
    scene.sceneType === "PATROL" && scene.investigationActive ? { rumor: 1 } : {};

  const playerDelta = mergePlayerDeltas(
    scene.eventCard.basePlayerDelta,
    selectedChoice.playerDelta,
    threatMod.player,
    extraDutyPenalty,
    investigationPenalty
  );

  const baseCampDelta = mergeCampDeltas(
    scene.eventCard.baseCampDelta,
    selectedChoice.campDelta,
    threatMod.camp,
    extraCampPenalty,
    investigationCampEffect
  );

  const reports =
    scene.sceneType === "CAMP"
      ? scene.debriefReports
      : makePatrolFieldReports(state, today.day, scene.eventCard.observationPool);

  const flags = summarizeFlags(reports, today);

  const packets = scene.sceneType === "CAMP" ? buildRumorPackets(reports, today.day, debriefChoiceId) : [];
  const rumorPropagation =
    scene.sceneType === "CAMP"
      ? propagateRumors(state, today.day, packets, debriefChoiceId)
      : {
          packets: [] as RumorPacket[],
          rumorReachCount: 0,
          campDelta: { rumor: flags.includes("CONFLICTING_TESTIMONY") ? 1 : 0 } as Partial<CampStats>,
          rumorAdoption: state.hidden.rumorAdoption,
        };

  let nextNpcProfiles = state.npcProfiles;
  let pendingAccusationConflict = state.hidden.pendingAccusationConflict;
  const events = [
    scene.eventCard.title,
    scene.eventCard.outcome,
    `Decision: ${selectedChoice.label}. ${selectedChoice.logText}`,
  ];

  if (isCalmEvent(scene.eventCard)) {
    events.push("Calm watch held. No urgent signs forced an alert.");
  }

  if (scene.sceneType === "CAMP" && debriefChoiceId === "ACCUSE_LIAR") {
    const trustShift = applyAccuseLiarTrustShift(state, reports);
    nextNpcProfiles = trustShift.npcProfiles;
    pendingAccusationConflict = true;
    if (trustShift.targetedNpcName) {
      events.push(`${trustShift.targetedNpcName} took the accusation personally.`);
    }
  }

  const conflictBacklashRng = createSeededRng(
    `${state.seed}:week:${state.week}:day:${today.day}:accusation-backlash`
  );
  let accusationBacklashDelta: Partial<CampStats> = {};
  if (scene.sceneType === "CAMP" && pendingAccusationConflict && conflictBacklashRng.nextFloat() < 0.42) {
    accusationBacklashDelta = { morale: -2, discipline: -1, rumor: 2 };
    pendingAccusationConflict = false;
    events.push("Accusation backlash flared after lights-out, splitting the barracks.");
    flags.push("ACCUSE_CONFLICT");
  }

  const finalCampDelta = mergeCampDeltas(
    baseCampDelta,
    rumorPropagation.campDelta,
    accusationBacklashDelta
  );

  const nextPlayerStats = applyPlayerDelta(state.playerStats, playerDelta);
  const nextCampStats = applyCampDelta(state.campStats, finalCampDelta);
  const dawnReport = createDawnReport(today.day, playerDelta, finalCampDelta, rumorPropagation.rumorReachCount);

  if (scene.routeDescription) {
    events.push(`Route: ${scene.routeDescription}`);
  }
  if (scene.sceneType === "CAMP") {
    events.push("You waited for patrol return and processed debrief reports.");
    const nothingCount = reports.filter(
      (report) => (report.claimedObservations[0] ?? "") === "nothing unusual"
    ).length;
    if (nothingCount >= Math.max(1, reports.length - 1)) {
      events.push("Debriefs stayed mostly quiet: nothing unusual dominated the hall.");
    }
  }
  if (today.disruption.type !== "NONE") {
    events.push(`Disruption note: ${today.disruption.reason}`);
  }

  const nightLog: NightLog = {
    day: today.day,
    events,
    dutyResolved: today.assignedDuty,
    debriefChoice: debriefChoiceId,
    rumorReachCount: rumorPropagation.rumorReachCount,
    deltas: {
      player: playerDelta,
      camp: finalCampDelta,
    },
    reports,
    rumorPackets: rumorPropagation.packets,
    flags,
  };

  const resolvedSummary = `${scene.eventCard.outcome} ${selectedChoice.logText}`.trim();
  const nextSchedule = state.schedule.map((entry, index) =>
    index === state.todayIndex
      ? {
          ...entry,
          resolved: true,
          eventTitle: scene.eventCard.title,
          summary: resolvedSummary,
        }
      : entry
  );

  const investigationFocusDelta =
    debriefChoiceId === "INVESTIGATE_QUIETLY"
      ? 1
      : scene.sceneType === "PATROL" && scene.investigationActive
        ? -1
        : 0;
  const nextInvestigationFocus = clamp(
    state.hidden.investigationFocus + investigationFocusDelta,
    0,
    3
  );

  const nextLastDebrief: DebriefSnapshot | null =
    scene.sceneType === "CAMP"
      ? {
          day: today.day,
          choiceId: debriefChoiceId,
          reports,
          packets: rumorPropagation.packets,
          rumorReachCount: rumorPropagation.rumorReachCount,
        }
      : state.hidden.lastDebrief;

  const nextIntenseStreak = isIntenseEvent(scene.eventCard)
    ? clamp(state.hidden.intenseStreak + 1, 0, 7)
    : 0;

  const nextState: GameState = {
    ...state,
    phase: "DAWN_REPORT",
    schedule: toWeekSchedule(nextSchedule),
    activeNightScene: null,
    dawnReport,
    playerStats: nextPlayerStats,
    campStats: nextCampStats,
    npcProfiles: nextNpcProfiles,
    nightLogs: [...state.nightLogs, nightLog],
    recentEvents: [
      ...state.recentEvents,
      `${today.label}: ${scene.eventCard.title}`,
      selectedChoice.logText,
      scene.sceneType === "CAMP" ? `Rumor reached ${rumorPropagation.rumorReachCount} watcher(s).` : "",
      dawnReport.summary,
    ]
      .filter(Boolean)
      .slice(-120),
    todaySummary: "Dawn report ready. Review changes, then start the next day.",
    weekSummary: null,
    hidden: {
      ...state.hidden,
      investigationFocus: nextInvestigationFocus,
      intenseStreak: nextIntenseStreak,
      pendingAccusationConflict,
      rumorAdoption: rumorPropagation.rumorAdoption,
      lastDebrief: nextLastDebrief,
    },
  };

  return gameStateSchema.parse(nextState);
}

export function startNextDay(state: GameState): GameState {
  if (state.complete || state.phase !== "DAWN_REPORT") {
    return state;
  }

  if (state.todayIndex >= 6) {
    const summary = buildWeekSummary(state);
    return gameStateSchema.parse({
      ...state,
      phase: "WEEK_SUMMARY",
      activeNightScene: null,
      dawnReport: null,
      complete: true,
      weekSummary: summary,
      todaySummary: "Week complete. Review your summary and decide your next run.",
      recentEvents: [...state.recentEvents, "Week 1 complete.", summary.firstBreakLabel].slice(-120),
    });
  }

  const nextIndex = state.todayIndex + 1;
  const nextSchedule = withTodayDisruption({ ...state }, nextIndex);
  const today = nextSchedule[nextIndex]!;

  const nextState: GameState = {
    ...state,
    todayIndex: nextIndex,
    schedule: nextSchedule,
    phase: "DAY",
    activeNightScene: null,
    dawnReport: null,
    weekSummary: null,
    todaySummary: daySummary(today),
    recentEvents: [
      ...state.recentEvents,
      `${today.label} started: ${today.assignedDuty}/${today.assignedShift}.`,
      summarizeDisruption(today.disruption),
    ].slice(-120),
  };

  return gameStateSchema.parse(nextState);
}

export interface SimulationReport {
  runs: number;
  averageNightsSurvived: number;
  averageEndMorale: number;
  averageRumor: number;
  collapseCauseDistribution: Record<string, number>;
}

export function runSimulationReport(
  baseSeed: string = DEFAULT_SEED,
  runs: number = 100,
  options?: { log?: boolean }
): SimulationReport {
  const totalRuns = Math.max(1, runs);
  const shouldLog = options?.log ?? true;
  let totalNightsSurvived = 0;
  let totalEndMorale = 0;
  let totalEndRumor = 0;
  const collapseCauseDistribution: Record<string, number> = {};

  for (let i = 0; i < totalRuns; i += 1) {
    let state = createInitialGameState(`${baseSeed}-sim-${i + 1}`);
    let guard = 0;

    while (state.phase !== "WEEK_SUMMARY" && guard < 80) {
      if (state.phase === "DAY") {
        state = beginNight(state);
      } else if (state.phase === "NIGHT_SCENE") {
        state = resolveNightScene(state, state.activeNightScene?.choices[0]?.id);
      } else if (state.phase === "DAWN_REPORT") {
        state = startNextDay(state);
      } else {
        break;
      }
      guard += 1;
    }

    totalNightsSurvived += state.nightLogs.length;
    totalEndMorale += state.campStats.morale;
    totalEndRumor += state.campStats.rumor;
    const cause = state.weekSummary?.firstBreakLabel ?? "No break label";
    collapseCauseDistribution[cause] = (collapseCauseDistribution[cause] ?? 0) + 1;
  }

  const report: SimulationReport = {
    runs: totalRuns,
    averageNightsSurvived: Number((totalNightsSurvived / totalRuns).toFixed(2)),
    averageEndMorale: Number((totalEndMorale / totalRuns).toFixed(2)),
    averageRumor: Number((totalEndRumor / totalRuns).toFixed(2)),
    collapseCauseDistribution,
  };

  if (shouldLog) {
    console.info("[Lowborn] Simulation Report");
    console.info(`Runs: ${report.runs}`);
    console.info(`Average nights survived: ${report.averageNightsSurvived}`);
    console.info(`Average end morale: ${report.averageEndMorale}`);
    console.info(`Average rumor: ${report.averageRumor}`);
    console.info("Collapse cause distribution:", report.collapseCauseDistribution);
  }

  return report;
}

// Backward-compatible aliases used by older UI/tests.
export const advanceToNight = beginNight;
export const nextDay = startNextDay;
