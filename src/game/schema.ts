import { z } from "zod";
import { ThreatSeed } from "./types";
import type { WeekSchedule } from "./types";

export const dutyTypeSchema = z.enum([
  "PATROL",
  "CAMP_WORK",
  "CAMP_WAIT",
  "NIGHT_WATCH",
  "REST",
]);
export const shiftTypeSchema = z.enum(["DAWN", "DAY", "DUSK", "NIGHT"]);
export const dayPhaseSchema = z.enum(["DAY", "NIGHT_SCENE", "DAWN_REPORT", "WEEK_SUMMARY"]);
export const disruptionTypeSchema = z.enum(["NONE", "FILL_IN_PATROL", "SWAP", "EXTRA_DUTY"]);
export const threatSeedSchema = z.nativeEnum(ThreatSeed);
export const nightEventTagSchema = z.enum(["mundane", "ambiguous", "hazard", "internal", "shock"]);

const boundedStatSchema = z.number().int().min(0).max(100);
const signedStatDeltaSchema = z.number().int().min(-100).max(100);

export const playerStatsSchema = z.object({
  warmth: boundedStatSchema,
  stamina: boundedStatSchema,
  injury: boundedStatSchema,
  hunger: boundedStatSchema,
  sanity: boundedStatSchema,
});

export const campStatsSchema = z.object({
  supplies: boundedStatSchema,
  morale: boundedStatSchema,
  discipline: boundedStatSchema,
  rumor: boundedStatSchema,
});

export const dailyDisruptionSchema = z.object({
  type: disruptionTypeSchema,
  chance: z.number().min(0).max(1),
  reason: z.string().nullable(),
  extraDuty: dutyTypeSchema.nullable(),
});

export const dayAssignmentSchema = z.object({
  day: z.number().int().min(1).max(7),
  label: z.string().min(1),
  scheduledDuty: dutyTypeSchema,
  scheduledShift: shiftTypeSchema,
  assignedDuty: dutyTypeSchema,
  assignedShift: shiftTypeSchema,
  disruption: dailyDisruptionSchema,
  resolved: z.boolean(),
  eventTitle: z.string().nullable(),
  summary: z.string().nullable(),
});

export const weekScheduleSchema = z
  .array(dayAssignmentSchema)
  .length(7)
  .transform((value) => value as WeekSchedule);

export const npcProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  loyalty: boundedStatSchema,
  fear: boundedStatSchema,
  belief: boundedStatSchema,
  trustInPlayer: boundedStatSchema,
  role: z.string().min(1),
});

export const patrolReportSchema = z.object({
  npcId: z.string().min(1),
  npcName: z.string().min(1).default("Unknown"),
  claimedObservations: z.array(z.string().min(1)).min(1),
  truthObservation: z.string().min(1).default("unknown"),
  presentedClaim: z.string().min(1).default("unknown"),
  confidence: z.number().min(0).max(1),
  emotion: z.enum(["STEADY", "ANXIOUS", "DEFIANT", "PANICKED"]),
  isLying: z.boolean(),
});

export const rumorPacketSchema = z.object({
  id: z.string().min(1),
  day: z.number().int().min(1).max(7),
  sourceNpcId: z.string().min(1),
  claim: z.string().min(1),
  truth: z.string().min(1),
  intensity: z.number().min(0).max(1),
  adoptedBy: z.array(z.string().min(1)),
});

export const nightLogSchema = z.object({
  day: z.number().int().min(1).max(7),
  events: z.array(z.string().min(1)).min(1),
  dutyResolved: dutyTypeSchema,
  debriefChoice: z
    .enum(["ESCALATE_COMMANDER", "DOWNPLAY", "INVESTIGATE_QUIETLY", "ACCUSE_LIAR"])
    .nullable()
    .default(null),
  rumorReachCount: z.number().int().min(0).max(100).default(0),
  deltas: z.object({
    player: z
      .object({
        warmth: signedStatDeltaSchema.optional(),
        stamina: signedStatDeltaSchema.optional(),
        injury: signedStatDeltaSchema.optional(),
        hunger: signedStatDeltaSchema.optional(),
        sanity: signedStatDeltaSchema.optional(),
      })
      .strict(),
    camp: z
      .object({
        supplies: signedStatDeltaSchema.optional(),
        morale: signedStatDeltaSchema.optional(),
        discipline: signedStatDeltaSchema.optional(),
        rumor: signedStatDeltaSchema.optional(),
      })
      .strict(),
  }),
  reports: z.array(patrolReportSchema),
  rumorPackets: z.array(rumorPacketSchema).default([]),
  flags: z.array(z.string().min(1)),
});

export const nightEventCardSchema = z.object({
  id: z.string().min(1),
  sceneType: z.enum(["PATROL", "CAMP"]),
  title: z.string().min(1),
  outcome: z.string().min(1),
  tags: z.array(nightEventTagSchema).min(1),
  routeTemplates: z.array(z.string().min(1)).min(1),
  basePlayerDelta: z
    .object({
      warmth: signedStatDeltaSchema.optional(),
      stamina: signedStatDeltaSchema.optional(),
      injury: signedStatDeltaSchema.optional(),
      hunger: signedStatDeltaSchema.optional(),
      sanity: signedStatDeltaSchema.optional(),
    })
    .strict(),
  baseCampDelta: z
    .object({
      supplies: signedStatDeltaSchema.optional(),
      morale: signedStatDeltaSchema.optional(),
      discipline: signedStatDeltaSchema.optional(),
      rumor: signedStatDeltaSchema.optional(),
    })
    .strict(),
  observationPool: z.array(z.string().min(1)).min(1),
});

export const nightDecisionOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  playerDelta: z
    .object({
      warmth: signedStatDeltaSchema.optional(),
      stamina: signedStatDeltaSchema.optional(),
      injury: signedStatDeltaSchema.optional(),
      hunger: signedStatDeltaSchema.optional(),
      sanity: signedStatDeltaSchema.optional(),
    })
    .strict(),
  campDelta: z
    .object({
      supplies: signedStatDeltaSchema.optional(),
      morale: signedStatDeltaSchema.optional(),
      discipline: signedStatDeltaSchema.optional(),
      rumor: signedStatDeltaSchema.optional(),
    })
    .strict(),
  logText: z.string().min(1),
});

export const nightSceneSchema = z.object({
  sceneType: z.enum(["PATROL", "CAMP"]),
  day: z.number().int().min(1).max(7),
  assignmentDuty: dutyTypeSchema,
  routeDescription: z.string().nullable(),
  presentedRouteDescription: z.string().nullable().default(null),
  eventCard: nightEventCardSchema,
  presentedOutcome: z.string().min(1).default(""),
  falsePerceptionOverlay: z.string().nullable().default(null),
  distortionLevel: z.enum(["NONE", "UNEASY", "SEVERE"]).default("NONE"),
  investigationActive: z.boolean().default(false),
  debriefReports: z.array(patrolReportSchema).default([]),
  choices: z.array(nightDecisionOptionSchema).min(1),
});

export const dawnReportSchema = z.object({
  day: z.number().int().min(1).max(7),
  title: z.string().min(1),
  summary: z.string().min(1),
  rumorReachCount: z.number().int().min(0).max(100).default(0),
  deltas: z.object({
    supplies: signedStatDeltaSchema,
    morale: signedStatDeltaSchema,
    discipline: signedStatDeltaSchema,
    rumor: signedStatDeltaSchema,
    warmth: signedStatDeltaSchema,
    stamina: signedStatDeltaSchema,
    sanity: signedStatDeltaSchema,
    injury: signedStatDeltaSchema,
  }),
});

export const weekSummarySchema = z.object({
  week: z.number().int().positive(),
  nightsSurvived: z.number().int().min(0).max(7),
  collapseIndicators: z.object({
    moraleLow: z.boolean(),
    disciplineLow: z.boolean(),
    rumorHigh: z.boolean(),
  }),
  firstBreakLabel: z.string().min(1),
  shareText: z.string().min(1),
});

export const npcRumorStateSchema = z.object({
  adopted: z.boolean(),
  heardCount: z.number().int().min(0).max(999),
  spreadCount: z.number().int().min(0).max(999),
  lastHeardDay: z.number().int().min(1).max(7).nullable(),
});

export const debriefSnapshotSchema = z.object({
  day: z.number().int().min(1).max(7),
  choiceId: z
    .enum(["ESCALATE_COMMANDER", "DOWNPLAY", "INVESTIGATE_QUIETLY", "ACCUSE_LIAR"])
    .nullable(),
  reports: z.array(patrolReportSchema),
  packets: z.array(rumorPacketSchema),
  rumorReachCount: z.number().int().min(0).max(100),
});

export const gameStateSchema = z.object({
  seed: z.string().min(1),
  week: z.number().int().positive(),
  todayIndex: z.number().int().min(0).max(6),
  schedule: weekScheduleSchema,
  phase: dayPhaseSchema,
  activeNightScene: nightSceneSchema.nullable(),
  dawnReport: dawnReportSchema.nullable(),
  playerStats: playerStatsSchema,
  campStats: campStatsSchema,
  npcProfiles: z.array(npcProfileSchema),
  nightLogs: z.array(nightLogSchema),
  recentEvents: z.array(z.string().min(1)),
  todaySummary: z.string(),
  weekSummary: weekSummarySchema.nullable().default(null),
  complete: z.boolean(),
  hidden: z.object({
    threatSeed: threatSeedSchema,
    investigationFocus: z.number().int().min(0).max(7).default(0),
    intenseStreak: z.number().int().min(0).max(7).default(0),
    pendingAccusationConflict: z.boolean().default(false),
    rumorAdoption: z.record(z.string(), npcRumorStateSchema).default({}),
    lastDebrief: debriefSnapshotSchema.nullable().default(null),
  }),
});

export const saveEnvelopeV6Schema = z.object({
  version: z.literal(6),
  savedAt: z.string(),
  gameState: gameStateSchema,
});

export const saveEnvelopeV5Schema = z.object({
  version: z.literal(5),
  savedAt: z.string(),
  gameState: gameStateSchema
    .omit({ weekSummary: true })
    .extend({
      weekSummary: weekSummarySchema.nullable().optional(),
      hidden: gameStateSchema.shape.hidden
        .omit({ intenseStreak: true })
        .extend({ intenseStreak: z.number().int().min(0).max(7).optional() }),
    }),
});

// Legacy v4 schema before rumor network state.
export const saveEnvelopeV4Schema = z.object({
  version: z.literal(4),
  savedAt: z.string(),
  gameState: z.object({
    seed: z.string().min(1),
    week: z.number().int().positive(),
    todayIndex: z.number().int().min(0).max(6),
    schedule: weekScheduleSchema,
    phase: dayPhaseSchema,
    activeNightScene: nightSceneSchema
      .omit({ investigationActive: true, debriefReports: true })
      .extend({
        investigationActive: z.boolean().optional(),
        debriefReports: z.array(patrolReportSchema).optional(),
      })
      .nullable(),
    dawnReport: dawnReportSchema
      .omit({ rumorReachCount: true })
      .extend({ rumorReachCount: z.number().int().min(0).max(100).optional() })
      .nullable(),
    playerStats: playerStatsSchema,
    campStats: campStatsSchema,
    npcProfiles: z.array(npcProfileSchema),
    nightLogs: z.array(
      nightLogSchema
        .omit({ debriefChoice: true, rumorReachCount: true, rumorPackets: true })
        .extend({
          debriefChoice: z
            .enum(["ESCALATE_COMMANDER", "DOWNPLAY", "INVESTIGATE_QUIETLY", "ACCUSE_LIAR"])
            .nullable()
            .optional(),
          rumorReachCount: z.number().int().min(0).max(100).optional(),
          rumorPackets: z.array(rumorPacketSchema).optional(),
        })
    ),
    recentEvents: z.array(z.string().min(1)),
    todaySummary: z.string(),
    complete: z.boolean(),
    hidden: z.object({
      threatSeed: threatSeedSchema.or(z.string()),
    }),
  }),
});

// Legacy v3 schema before night scene/dawn report split.
export const saveEnvelopeV3Schema = z.object({
  version: z.literal(3),
  savedAt: z.string(),
  gameState: z.object({
    seed: z.string().min(1),
    week: z.number().int().positive(),
    todayIndex: z.number().int().min(0).max(6),
    schedule: weekScheduleSchema,
    phase: z.enum(["DAY", "NIGHT"]),
    playerStats: playerStatsSchema,
    campStats: campStatsSchema,
    npcProfiles: z.array(npcProfileSchema),
    nightLogs: z.array(nightLogSchema),
    recentEvents: z.array(z.string().min(1)),
    todaySummary: z.string(),
    complete: z.boolean(),
    hidden: z.object({
      threatSeed: threatSeedSchema.or(z.string()),
    }),
  }),
});

const legacyV2DayAssignmentSchema = z.object({
  day: z.number().int().min(1).max(7),
  label: z.string().min(1),
  dutyType: z.enum(["PATROL", "CAMP"]),
  shift: z.enum(["DAWN", "DUSK", "NIGHT"]),
  resolved: z.boolean(),
  eventTitle: z.string().nullable(),
  summary: z.string().nullable(),
});

const legacyV2GameStateSchema = z.object({
  seed: z.string().min(1),
  week: z.number().int().positive(),
  day: z.number().int().min(1).max(7),
  weekSchedule: z.array(legacyV2DayAssignmentSchema).length(7),
  playerStats: playerStatsSchema,
  campStats: campStatsSchema,
  npcProfiles: z.array(npcProfileSchema),
  nightLogs: z.array(
    z.object({
      day: z.number().int().min(1).max(7),
      events: z.array(z.string().min(1)),
      deltas: z.object({
        player: z.record(z.string(), signedStatDeltaSchema),
        camp: z.record(z.string(), signedStatDeltaSchema),
      }),
      reports: z.array(patrolReportSchema),
      flags: z.array(z.string().min(1)),
    })
  ),
  recentEvents: z.array(z.string().min(1)),
  todaySummary: z.string(),
  complete: z.boolean(),
  hidden: z.object({
    threatSeed: z.string(),
  }),
});

export const saveEnvelopeV2Schema = z.object({
  version: z.literal(2),
  savedAt: z.string(),
  gameState: legacyV2GameStateSchema,
});

export const legacyRunSnapshotSchema = z.object({
  seed: z.string().min(1),
  week: z.number().int().positive(),
  day: z.number().int().min(1).max(7),
  schedule: z
    .array(
      z.object({
        day: z.number().int().min(1).max(7),
        label: z.string().min(1),
        plannedDuty: z.enum(["PATROL", "CAMP"]),
        resolved: z.boolean(),
        eventTitle: z.string().nullable(),
        summary: z.string().nullable(),
      })
    )
    .length(7),
  stats: z.object({
    supplies: boundedStatSchema,
    morale: boundedStatSchema,
    discipline: boundedStatSchema,
    rumor: boundedStatSchema,
    warmth: boundedStatSchema,
    stamina: boundedStatSchema,
    sanity: boundedStatSchema,
  }),
  todaySummary: z.string(),
  log: z.array(z.string()),
  complete: z.boolean(),
});

export const saveEnvelopeV1Schema = z.object({
  version: z.literal(1),
  savedAt: z.string(),
  snapshot: legacyRunSnapshotSchema,
});
