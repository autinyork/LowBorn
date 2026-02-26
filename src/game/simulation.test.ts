import { describe, expect, it, vi } from "vitest";
import {
  applyDailyDisruption,
  beginNight,
  buildNpcProfiles,
  createInitialGameState,
  generateWeekSchedule,
  resolveNightScene,
  runSimulationReport,
  startNextDay,
} from "./simulation";
import { ThreatSeed } from "./types";

const DEBRIEF_CLAIMS = [
  "tracks in snow",
  "distant light",
  "howl",
  "missing man",
  "nothing unusual",
  "strange symbol",
];

describe("week scheduler", () => {
  it("always generates seven days with 1-3 patrol assignments", () => {
    for (let i = 0; i < 120; i += 1) {
      const schedule = generateWeekSchedule(`schedule-seed-${i}`, 1);
      const patrolCount = schedule.filter((entry) => entry.scheduledDuty === "PATROL").length;
      expect(schedule).toHaveLength(7);
      expect(patrolCount).toBeGreaterThanOrEqual(1);
      expect(patrolCount).toBeLessThanOrEqual(3);
    }
  });
});

describe("daily disruption", () => {
  it("produces valid outcomes for each disruption type", () => {
    let sawDisruption = false;
    const seenTypes = new Set<string>();
    for (let i = 0; i < 260; i += 1) {
      const seed = `disrupt-seed-${i}`;
      const schedule = generateWeekSchedule(seed, 1);
      for (const assignment of schedule) {
        const disrupted = applyDailyDisruption(assignment, seed, 1);
        expect(disrupted.disruption.chance).toBeGreaterThanOrEqual(0.25);
        expect(disrupted.disruption.chance).toBeLessThanOrEqual(0.4);

        if (disrupted.disruption.type === "NONE") {
          continue;
        }

        sawDisruption = true;
        seenTypes.add(disrupted.disruption.type);

        if (disrupted.disruption.type === "FILL_IN_PATROL") {
          expect(disrupted.assignedDuty).toBe("PATROL");
        } else if (disrupted.disruption.type === "SWAP") {
          if (assignment.scheduledDuty === "PATROL") {
            expect(disrupted.assignedDuty).not.toBe("PATROL");
          } else {
            expect(disrupted.assignedDuty).toBe("PATROL");
          }
        } else if (disrupted.disruption.type === "EXTRA_DUTY") {
          expect(disrupted.disruption.extraDuty).toBe("NIGHT_WATCH");
        }
      }
    }
    expect(sawDisruption).toBe(true);
    expect(seenTypes.has("FILL_IN_PATROL")).toBe(true);
    expect(seenTypes.has("SWAP")).toBe(true);
    expect(seenTypes.has("EXTRA_DUTY")).toBe(true);
  });

  it("plans 1-3 disruptions per week for realistic pacing", () => {
    for (let i = 0; i < 120; i += 1) {
      const seed = `disruption-plan-seed-${i}`;
      const schedule = generateWeekSchedule(seed, 1);
      const disruptedCount = schedule.reduce((count, assignment) => {
        const disrupted = applyDailyDisruption(assignment, seed, 1);
        return disrupted.disruption.type === "NONE" ? count : count + 1;
      }, 0);

      expect(disruptedCount).toBeGreaterThanOrEqual(1);
      expect(disruptedCount).toBeLessThanOrEqual(3);
    }
  });

  it("never emits contradictory reassignment outcomes", () => {
    for (let i = 0; i < 120; i += 1) {
      const seed = `disruption-coherence-seed-${i}`;
      const schedule = generateWeekSchedule(seed, 1);

      for (const assignment of schedule) {
        const disrupted = applyDailyDisruption(assignment, seed, 1);
        if (disrupted.disruption.type === "NONE") {
          expect(disrupted.assignedDuty).toBe(assignment.scheduledDuty);
          continue;
        }

        if (disrupted.disruption.type === "FILL_IN_PATROL") {
          expect(assignment.scheduledDuty).not.toBe("PATROL");
          expect(disrupted.assignedDuty).toBe("PATROL");
        }

        if (disrupted.disruption.type === "EXTRA_DUTY") {
          expect(assignment.scheduledDuty).not.toBe("NIGHT_WATCH");
          expect(disrupted.disruption.extraDuty).toBe("NIGHT_WATCH");
          expect(disrupted.assignedDuty).toBe(assignment.scheduledDuty);
        }
      }
    }
  });
});

describe("npc roster", () => {
  it("creates 8-14 stable NPC entries", () => {
    const rosterA = buildNpcProfiles("roster-seed");
    const rosterB = buildNpcProfiles("roster-seed");

    expect(rosterA.length).toBeGreaterThanOrEqual(8);
    expect(rosterA.length).toBeLessThanOrEqual(14);
    expect(rosterA.map((npc) => npc.id)).toEqual(rosterB.map((npc) => npc.id));
    expect(new Set(rosterA.map((npc) => npc.id)).size).toBe(rosterA.length);
  });
});

describe("day flow actions", () => {
  it("requires scene resolution before moving to next day", () => {
    const initial = createInitialGameState("phase-flow-seed");
    const blocked = startNextDay(initial);
    expect(blocked.todayIndex).toBe(initial.todayIndex);
    expect(blocked.phase).toBe("DAY");

    const atNight = beginNight(initial);
    expect(atNight.phase).toBe("NIGHT_SCENE");
    expect(atNight.activeNightScene).not.toBeNull();
    expect(atNight.schedule[initial.todayIndex]?.resolved).toBe(false);

    const atDawn = resolveNightScene(atNight, atNight.activeNightScene?.choices[0]?.id);
    expect(atDawn.phase).toBe("DAWN_REPORT");
    expect(atDawn.schedule[initial.todayIndex]?.resolved).toBe(true);
    expect(atDawn.dawnReport).not.toBeNull();
    expect(atDawn.nightLogs).toHaveLength(initial.nightLogs.length + 1);

    const next = startNextDay(atDawn);
    expect(next.todayIndex).toBe(initial.todayIndex + 1);
    expect(next.phase).toBe("DAY");
    expect(next.activeNightScene).toBeNull();
    expect(next.dawnReport).toBeNull();
  });

  it("patrol scenes always provide 2-3 decision options", () => {
    for (let i = 0; i < 40; i += 1) {
      const state = createInitialGameState(`patrol-choice-seed-${i}`);
      const withPatrol = {
        ...state,
        schedule: state.schedule.map((entry, index) =>
          index === state.todayIndex ? { ...entry, assignedDuty: "PATROL" as const } : entry
        ) as typeof state.schedule,
      };
      const atNight = beginNight(withPatrol);
      expect(atNight.activeNightScene?.sceneType).toBe("PATROL");
      expect(atNight.activeNightScene?.choices.length).toBeGreaterThanOrEqual(2);
      expect(atNight.activeNightScene?.choices.length).toBeLessThanOrEqual(3);
    }
  });

  it("camp nights produce debrief reports from the fixed claim pool", () => {
    const initial = createInitialGameState("camp-debrief-seed");
    const forcedCamp = {
      ...initial,
      schedule: initial.schedule.map((entry, index) =>
        index === initial.todayIndex ? { ...entry, assignedDuty: "CAMP_WAIT" as const } : entry
      ) as typeof initial.schedule,
    };
    const atNight = beginNight(forcedCamp);
    const scene = atNight.activeNightScene;
    expect(scene?.sceneType).toBe("CAMP");
    expect(scene?.debriefReports.length).toBeGreaterThanOrEqual(2);
    expect(scene?.debriefReports.length).toBeLessThanOrEqual(4);
    for (const report of scene?.debriefReports ?? []) {
      expect(DEBRIEF_CLAIMS.includes(report.claimedObservations[0] ?? "")).toBe(true);
    }
  });

  it("calm camp nights keep at least one 'nothing unusual' debrief claim", () => {
    let sawCalmCamp = false;

    for (let i = 0; i < 60; i += 1) {
      const initial = createInitialGameState(`calm-camp-seed-${i}`);
      const forcedCamp = {
        ...initial,
        hidden: {
          ...initial.hidden,
          intenseStreak: 3,
          threatSeed: ThreatSeed.NONE,
        },
        schedule: initial.schedule.map((entry, index) =>
          index === initial.todayIndex ? { ...entry, assignedDuty: "CAMP_WAIT" as const } : entry
        ) as typeof initial.schedule,
      };
      const atNight = beginNight(forcedCamp);
      const scene = atNight.activeNightScene;
      if (!scene || scene.sceneType !== "CAMP") {
        continue;
      }

      if (scene.eventCard.tags.includes("mundane")) {
        sawCalmCamp = true;
        const claims = scene.debriefReports.map((report) => report.claimedObservations[0]);
        expect(claims).toContain("nothing unusual");
      }
    }

    expect(sawCalmCamp).toBe(true);
  });

  it("camp debrief choices propagate rumor and expose rumor reach in dawn report", () => {
    const initial = createInitialGameState("rumor-propagation-seed");
    const forcedCamp = {
      ...initial,
      schedule: initial.schedule.map((entry, index) =>
        index === initial.todayIndex ? { ...entry, assignedDuty: "CAMP_WAIT" as const } : entry
      ) as typeof initial.schedule,
    };
    const atNight = beginNight(forcedCamp);
    const atDawn = resolveNightScene(atNight, "ESCALATE_COMMANDER");

    expect(atDawn.phase).toBe("DAWN_REPORT");
    expect(atDawn.dawnReport?.rumorReachCount ?? 0).toBeGreaterThanOrEqual(1);
    expect(atDawn.hidden.lastDebrief?.reports.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(Object.values(atDawn.hidden.rumorAdoption).some((node) => node.heardCount > 0)).toBe(true);
  });

  it("investigate quietly increases next patrol encounter pressure once", () => {
    const initial = createInitialGameState("investigate-seed");
    const forcedCamp = {
      ...initial,
      schedule: initial.schedule.map((entry, index) =>
        index === initial.todayIndex ? { ...entry, assignedDuty: "CAMP_WAIT" as const } : entry
      ) as typeof initial.schedule,
    };
    const atNight = beginNight(forcedCamp);
    const atDawn = resolveNightScene(atNight, "INVESTIGATE_QUIETLY");

    expect(atDawn.hidden.investigationFocus).toBeGreaterThan(0);

    const nextIndex = Math.min(atDawn.todayIndex + 1, 6);
    const forcedPatrolDay = {
      ...atDawn,
      todayIndex: nextIndex,
      phase: "DAY" as const,
      dawnReport: null,
      activeNightScene: null,
      schedule: atDawn.schedule.map((entry, index) =>
        index === nextIndex
          ? { ...entry, assignedDuty: "PATROL" as const, resolved: false, eventTitle: null, summary: null }
          : entry
      ) as typeof atDawn.schedule,
    };

    const patrolNight = beginNight(forcedPatrolDay);
    expect(patrolNight.activeNightScene?.sceneType).toBe("PATROL");
    expect(patrolNight.activeNightScene?.investigationActive).toBe(true);

    const afterPatrol = resolveNightScene(patrolNight, patrolNight.activeNightScene?.choices[0]?.id);
    expect(afterPatrol.hidden.investigationFocus).toBe(atDawn.hidden.investigationFocus - 1);
  });

  it("pacing controller blocks long intense streaks across full weeks", () => {
    for (let i = 0; i < 50; i += 1) {
      let state = createInitialGameState(`pacing-seed-${i}`);
      let maxStreak = 0;

      while (state.phase !== "WEEK_SUMMARY") {
        if (state.phase === "DAY") {
          state = beginNight(state);
          continue;
        }
        if (state.phase === "NIGHT_SCENE") {
          state = resolveNightScene(state, state.activeNightScene?.choices[0]?.id);
          maxStreak = Math.max(maxStreak, state.hidden.intenseStreak);
          continue;
        }
        if (state.phase === "DAWN_REPORT") {
          state = startNextDay(state);
          continue;
        }
      }

      expect(maxStreak).toBeLessThanOrEqual(2);
    }
  });

  it("transitions to week summary after day seven dawn", () => {
    let state = createInitialGameState("week-summary-seed");

    while (state.phase !== "WEEK_SUMMARY") {
      if (state.phase === "DAY") {
        state = beginNight(state);
      } else if (state.phase === "NIGHT_SCENE") {
        state = resolveNightScene(state, state.activeNightScene?.choices[0]?.id);
      } else if (state.phase === "DAWN_REPORT") {
        state = startNextDay(state);
      }
    }

    expect(state.complete).toBe(true);
    expect(state.weekSummary).not.toBeNull();
    expect(state.weekSummary?.nightsSurvived).toBe(7);
    expect(state.weekSummary?.shareText).toContain("Lowborn Week 1 Summary");
  });

  it("always completes 7-day runs without deadlock and with valid dawn deltas", () => {
    for (let i = 0; i < 100; i += 1) {
      let state = createInitialGameState(`stability-seed-${i}`);
      let guard = 0;

      while (state.phase !== "WEEK_SUMMARY" && guard < 80) {
        if (state.phase === "DAY") {
          state = beginNight(state);
        } else if (state.phase === "NIGHT_SCENE") {
          state = resolveNightScene(state, state.activeNightScene?.choices[0]?.id);
        } else if (state.phase === "DAWN_REPORT") {
          if (state.dawnReport) {
            for (const value of Object.values(state.dawnReport.deltas)) {
              expect(Number.isFinite(value)).toBe(true);
            }
          }
          state = startNextDay(state);
        }
        guard += 1;
      }

      expect(guard).toBeLessThan(80);
      expect(state.phase).toBe("WEEK_SUMMARY");
      expect(state.nightLogs).toHaveLength(7);
    }
  });

  it("is deterministic end-to-end for the same seed and default choices", () => {
    const runWeek = (seed: string) => {
      let state = createInitialGameState(seed);
      let guard = 0;
      while (state.phase !== "WEEK_SUMMARY" && guard < 80) {
        if (state.phase === "DAY") {
          state = beginNight(state);
        } else if (state.phase === "NIGHT_SCENE") {
          state = resolveNightScene(state, state.activeNightScene?.choices[0]?.id);
        } else if (state.phase === "DAWN_REPORT") {
          state = startNextDay(state);
        }
        guard += 1;
      }
      return state;
    };

    const first = runWeek("deterministic-week-seed");
    const second = runWeek("deterministic-week-seed");

    expect(first.weekSummary?.shareText).toBe(second.weekSummary?.shareText);
    expect(first.campStats).toEqual(second.campStats);
    expect(first.playerStats).toEqual(second.playerStats);
    expect(first.schedule.map((entry) => entry.assignedDuty)).toEqual(
      second.schedule.map((entry) => entry.assignedDuty)
    );
  });
});

describe("threat seed + sanity presentation separation", () => {
  it("produces deterministic underlying truth with the same seed", () => {
    const seed = "deterministic-truth-seed";
    const baseA = createInitialGameState(seed);
    const baseB = createInitialGameState(seed);

    const forceCamp = <T extends typeof baseA>(state: T) =>
      ({
        ...state,
        schedule: state.schedule.map((entry, index) =>
          index === state.todayIndex ? { ...entry, assignedDuty: "CAMP_WAIT" as const } : entry
        ) as typeof state.schedule,
      }) as T;

    const nightA = beginNight(forceCamp(baseA));
    const nightB = beginNight(forceCamp(baseB));

    expect(nightA.hidden.threatSeed).toBe(nightB.hidden.threatSeed);
    expect(nightA.activeNightScene?.eventCard.id).toBe(nightB.activeNightScene?.eventCard.id);
    expect(
      nightA.activeNightScene?.debriefReports.map((report) => ({
        npcId: report.npcId,
        truth: report.truthObservation,
        claim: report.claimedObservations[0],
        isLying: report.isLying,
      }))
    ).toEqual(
      nightB.activeNightScene?.debriefReports.map((report) => ({
        npcId: report.npcId,
        truth: report.truthObservation,
        claim: report.claimedObservations[0],
        isLying: report.isLying,
      }))
    );
  });

  it("changes presentation with sanity without mutating truth state", () => {
    const seed = "sanity-presentation-seed";
    const baseline = createInitialGameState(seed);

    const forceCamp = <T extends typeof baseline>(state: T) =>
      ({
        ...state,
        schedule: state.schedule.map((entry, index) =>
          index === state.todayIndex ? { ...entry, assignedDuty: "CAMP_WAIT" as const } : entry
        ) as typeof state.schedule,
      }) as T;

    const highSanity = forceCamp({
      ...baseline,
      playerStats: { ...baseline.playerStats, sanity: 70 },
    });
    const lowSanity = forceCamp({
      ...baseline,
      playerStats: { ...baseline.playerStats, sanity: 15 },
    });

    const highNight = beginNight(highSanity);
    const lowNight = beginNight(lowSanity);

    expect(highNight.activeNightScene?.eventCard.id).toBe(lowNight.activeNightScene?.eventCard.id);
    expect(
      highNight.activeNightScene?.debriefReports.map((report) => ({
        npcId: report.npcId,
        truth: report.truthObservation,
        claim: report.claimedObservations[0],
        isLying: report.isLying,
      }))
    ).toEqual(
      lowNight.activeNightScene?.debriefReports.map((report) => ({
        npcId: report.npcId,
        truth: report.truthObservation,
        claim: report.claimedObservations[0],
        isLying: report.isLying,
      }))
    );

    expect(highNight.activeNightScene?.presentedOutcome).not.toBe(lowNight.activeNightScene?.presentedOutcome);

    const highResolved = resolveNightScene(highNight, "ESCALATE_COMMANDER");
    const lowResolved = resolveNightScene(lowNight, "ESCALATE_COMMANDER");

    expect(
      highResolved.nightLogs[0]?.reports.map((report) => ({
        truth: report.truthObservation,
        claim: report.claimedObservations[0],
        isLying: report.isLying,
      }))
    ).toEqual(
      lowResolved.nightLogs[0]?.reports.map((report) => ({
        truth: report.truthObservation,
        claim: report.claimedObservations[0],
        isLying: report.isLying,
      }))
    );
  });
});

describe("simulation report", () => {
  it("runs deterministic aggregate reporting over 100 seeded runs", () => {
    const first = runSimulationReport("balance-audit-seed", 100, { log: false });
    const second = runSimulationReport("balance-audit-seed", 100, { log: false });

    expect(first.runs).toBe(100);
    expect(first).toEqual(second);
    expect(first.averageNightsSurvived).toBeGreaterThanOrEqual(0);
    expect(first.averageEndMorale).toBeGreaterThanOrEqual(0);
    expect(first.averageRumor).toBeGreaterThanOrEqual(0);
    expect(Object.keys(first.collapseCauseDistribution).length).toBeGreaterThan(0);
  });

  it("prints report metrics to console by default for balancing", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    runSimulationReport("balance-log-seed", 5);
    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });
});
