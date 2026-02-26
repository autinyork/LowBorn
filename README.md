# Lowborn

Lowborn is a deterministic single-player frontier-watch simulation prototype.

## Design philosophy

Lowborn is a procedural psychological frontier simulation about order, fear, and collapse.

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npm run test
```

## Build

```bash
npm run build
```

## Architecture overview

- `src/game/types.ts`
  central domain types for simulation, reports, logs, and hidden state.
- `src/game/simulation.ts`
  core deterministic state machine and simulation rules:
  day -> night scene -> dawn report -> next day -> week summary.
- `src/game/schema.ts` + `src/game/migrations.ts`
  Zod validation and localStorage save-version migration.
- `src/content/events.ts`
  event card catalog and category groupings (mundane/ambiguous/hazard/internal/shock).
- `src/state/useGameStore.ts`
  Zustand app state, screen routing, and persisted settings wiring.
- `src/ui/*`
  presentation layers only; hidden truth is surfaced only in the Developer Panel.

## Core loop explanation

1. Start run with seed.
2. Generate week schedule and deterministic disruption plan.
3. Resolve each night (PATROL or CAMP).
4. Apply stat deltas and generate Dawn Report.
5. Advance through Day 7 and produce Week Summary.
6. Review Run Journal / exports for playtest analysis.

## How determinism works

- Every stochastic system uses `createSeededRng(...)` with stable string keys.
- Threat seed, schedule/disruptions, event picks, report truth/claims, and rumor spread are seed-driven.
- Sanity distortion modifies presentation text only; hidden truth state is unchanged.
- Same seed + same choices => same run outcome.

## Where to tune pacing

- Event weighting and escalation:
  `src/game/simulation.ts` -> `eventWeightForThreat(...)`
- Threat pressure modifiers:
  `src/game/simulation.ts` -> `threatModifierForEvent(...)`
- Disruption cadence:
  `src/game/simulation.ts` -> `buildWeeklyDisruptionPlan(...)` and `applyDailyDisruption(...)`
- Rumor spread pressure:
  `src/game/simulation.ts` -> `propagateRumors(...)`
- Aggregate balancing helper:
  browser console -> `window.run_simulation_report("seed", 100)`

## Expanding event cards safely

1. Add cards via `makeCard(...)` in `src/content/events.ts`.
2. Keep tags aligned with `NightEventTag` in `src/game/types.ts`.
3. Provide non-empty `observationPool` and route templates.
4. Keep delta magnitude intentional by category (mundane low-impact; shock rare/high-impact).
5. Run `npm run test` and check `src/content/events.test.ts` count/schema expectations.
