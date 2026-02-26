export type DutyType = "PATROL" | "CAMP_WORK" | "CAMP_WAIT" | "NIGHT_WATCH" | "REST";

export type ShiftType = "DAWN" | "DAY" | "DUSK" | "NIGHT";

export type DayPhase = "DAY" | "NIGHT_SCENE" | "DAWN_REPORT" | "WEEK_SUMMARY";

export type DisruptionType = "NONE" | "FILL_IN_PATROL" | "SWAP" | "EXTRA_DUTY";

// Hidden world-state setting for a run:
// REAL -> external danger is mostly genuine.
// EXAGGERATED -> mixed truth with amplified interpretations.
// NONE -> most danger cues are noise, mistakes, or social pressure.
export enum ThreatSeed {
  REAL = "REAL",
  EXAGGERATED = "EXAGGERATED",
  NONE = "NONE",
}

export interface DailyDisruption {
  type: DisruptionType;
  chance: number;
  reason: string | null;
  extraDuty: DutyType | null;
}

export interface DayAssignment {
  day: number;
  label: string;
  scheduledDuty: DutyType;
  scheduledShift: ShiftType;
  assignedDuty: DutyType;
  assignedShift: ShiftType;
  disruption: DailyDisruption;
  resolved: boolean;
  eventTitle: string | null;
  summary: string | null;
}

export type WeekSchedule = [
  DayAssignment,
  DayAssignment,
  DayAssignment,
  DayAssignment,
  DayAssignment,
  DayAssignment,
  DayAssignment,
];

export interface PlayerStats {
  warmth: number;
  stamina: number;
  injury: number;
  hunger: number;
  sanity: number;
}

export interface CampStats {
  supplies: number;
  morale: number;
  discipline: number;
  rumor: number;
}

export interface NPCProfile {
  id: string;
  name: string;
  loyalty: number;
  fear: number;
  belief: number;
  trustInPlayer: number;
  role: string;
}

export type ReportEmotion = "STEADY" | "ANXIOUS" | "DEFIANT" | "PANICKED";

export interface PatrolReport {
  npcId: string;
  npcName: string;
  // Player-facing claim text (what the NPC says happened).
  claimedObservations: string[];
  // Hidden simulation truth; only shown in the Developer Panel.
  truthObservation: string;
  // Presentation-layer variant of the claim (sanity can alter wording only).
  presentedClaim: string;
  confidence: number;
  emotion: ReportEmotion;
  // Hidden truth flag: intentional deception, not simple mistake.
  isLying: boolean;
}

export type DebriefChoiceId =
  | "ESCALATE_COMMANDER"
  | "DOWNPLAY"
  | "INVESTIGATE_QUIETLY"
  | "ACCUSE_LIAR";

export interface RumorPacket {
  id: string;
  day: number;
  sourceNpcId: string;
  // Public claim that propagates through camp.
  claim: string;
  // Hidden truth behind the originating report.
  truth: string;
  // Spread pressure scalar (0..1) used by propagation rules.
  intensity: number;
  adoptedBy: string[];
}

export interface NightLog {
  day: number;
  // Ordered narrative notes for what actually resolved this night.
  events: string[];
  dutyResolved: DutyType;
  debriefChoice: DebriefChoiceId | null;
  rumorReachCount: number;
  deltas: {
    player: Partial<PlayerStats>;
    camp: Partial<CampStats>;
  };
  reports: PatrolReport[];
  rumorPackets: RumorPacket[];
  flags: string[];
}

export type NightEventTag = "mundane" | "ambiguous" | "hazard" | "internal" | "shock";

export interface NightEventCard {
  id: string;
  sceneType: "PATROL" | "CAMP";
  title: string;
  outcome: string;
  tags: NightEventTag[];
  routeTemplates: string[];
  basePlayerDelta: Partial<PlayerStats>;
  baseCampDelta: Partial<CampStats>;
  observationPool: string[];
}

export interface NightDecisionOption {
  id: string;
  label: string;
  description: string;
  playerDelta: Partial<PlayerStats>;
  campDelta: Partial<CampStats>;
  logText: string;
}

export interface NightScene {
  sceneType: "PATROL" | "CAMP";
  day: number;
  assignmentDuty: DutyType;
  routeDescription: string | null;
  presentedRouteDescription: string | null;
  eventCard: NightEventCard;
  presentedOutcome: string;
  falsePerceptionOverlay: string | null;
  distortionLevel: "NONE" | "UNEASY" | "SEVERE";
  investigationActive: boolean;
  debriefReports: PatrolReport[];
  choices: NightDecisionOption[];
}

export interface DawnReport {
  day: number;
  title: string;
  summary: string;
  rumorReachCount: number;
  deltas: {
    supplies: number;
    morale: number;
    discipline: number;
    rumor: number;
    warmth: number;
    stamina: number;
    sanity: number;
    injury: number;
  };
}

export interface WeekSummary {
  week: number;
  nightsSurvived: number;
  collapseIndicators: {
    moraleLow: boolean;
    disciplineLow: boolean;
    rumorHigh: boolean;
  };
  firstBreakLabel: string;
  shareText: string;
}

export interface NpcTemplate {
  id: string;
  role: string;
  attitude: "steady" | "wary" | "volatile";
}

export interface NpcRumorState {
  adopted: boolean;
  heardCount: number;
  spreadCount: number;
  lastHeardDay: number | null;
}

export interface DebriefSnapshot {
  day: number;
  choiceId: DebriefChoiceId | null;
  reports: PatrolReport[];
  packets: RumorPacket[];
  rumorReachCount: number;
}

export interface GameState {
  seed: string;
  week: number;
  todayIndex: number;
  schedule: WeekSchedule;
  phase: DayPhase;
  activeNightScene: NightScene | null;
  dawnReport: DawnReport | null;
  playerStats: PlayerStats;
  campStats: CampStats;
  npcProfiles: NPCProfile[];
  nightLogs: NightLog[];
  recentEvents: string[];
  todaySummary: string;
  weekSummary: WeekSummary | null;
  complete: boolean;
  hidden: {
    threatSeed: ThreatSeed;
    investigationFocus: number;
    intenseStreak: number;
    pendingAccusationConflict: boolean;
    rumorAdoption: Record<string, NpcRumorState>;
    lastDebrief: DebriefSnapshot | null;
  };
}
