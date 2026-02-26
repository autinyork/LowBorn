Original prompt: You are an expert full-stack game engineer. Build an original web game called “Lowborn” (GOT-inspired frontier watch vibe, but NO Game of Thrones names, places, or characters). This is a personal-project-first prototype with a path to commercialization.

## 2026-02-25 - Task focus
- First task completed: create repo structure and initial scaffolding.
- Assumption made: migrate the workspace to a React+Vite+TypeScript app while preserving prior prototype files that are no longer wired into the app runtime.

## 2026-02-25 - Scaffold implemented
- Toolchain scaffolded:
  - React + Vite + TypeScript
  - Tailwind CSS
  - Zustand
  - Zod
  - Vitest
- Config/scripts added and validated:
  - `npm run dev`
  - `npm run build`
  - `npm run preview`
  - `npm run test`
  - `npm run test:watch`
  - `npm run check`
- Project docs:
  - `README.md` with architecture, scripts, and suggested commit boundaries.

## 2026-02-25 - Initial architecture
- `src/sim/`
  - Deterministic seeded simulation engine for a one-week vertical slice.
  - Procedural upfront schedule generation (PATROL/CAMP).
  - Daily disruption logic (fill-in/swap) that can reassign duties.
  - PATROL/CAMP event resolution.
  - Rumor creation, spread, and debrief conflict edges.
  - Dawn report delta generation.
- `src/state/`
  - Zustand store with localStorage persistence.
  - Zod validation for persisted week state.
- `src/components/`
  - Week schedule panel.
  - Dawn report card.
  - Stats panel.
  - Event log.
  - Developer panel (seed, threat seed, rumor spread graph).

## 2026-02-25 - Test coverage added (Vitest)
- Deterministic repeatability with same seed.
- Disruption reassignment appears across seed sample.
- Rumor conflict edges can emerge across seed sample.
- Dawn report stat deltas match real stat transitions.

## 2026-02-25 - Validation results
- `npm run test`: pass.
- `npm run build`: pass.
- `npm run check`: pass.

## TODO / suggestions for next agent
- Implement richer PATROL and CAMP interactive loops in the UI (current scaffold resolves days via simulation button, not moment-to-moment scenes).
- Add explicit visual timeline for "planned vs actual" plus disruption reason history.
- Expand rumor graph visualization from text list to node-edge map.
- Add game balancing pass for week outcomes and edge-case seeds.
- Add optional import/export save payload for commercialization-ready playtest sharing.

## 2026-02-25 - Requested scaffolding refresh (folder contract)
- Completed the explicit folder contract:
  - `src/app`
  - `src/game`
  - `src/state`
  - `src/ui`
  - `src/content`
  - `src/utils`
- Replaced previous `src/sim` + `src/components` tree with new structure.
- Built minimal UI shell with conditional single-page routing:
  - Title screen: `New Run`, `Continue`, `Settings`
  - New Run flow: optional seed input and start at Week 1 Day 1
  - Main game layout:
    - Left: Schedule Board (weekly view)
    - Center: Today panel (duty + summary + action)
    - Right: Stats (Supplies, Morale, Discipline, Rumor, Warmth, Stamina, Sanity)
    - Bottom: Log panel (recent events)
- Implemented deterministic simulation and content scaffolding:
  - Event cards, NPC templates, names under `src/content`
  - Seeded RNG and day resolution under `src/game`
- Implemented localStorage persistence with explicit versioning:
  - `SAVE_KEY` + `SAVE_VERSION`
  - Load/write/clear helpers under `src/utils/storage.ts`
- Validation:
  - `npm run test`: pass
  - `npm run build`: pass

## 2026-02-25 - Core simulation primitives + model pass
- Implemented required RNG utility in `src/utils/rng.ts`:
  - string-seeded deterministic generator
  - `nextFloat()`
  - `nextInt(min, max)`
  - `pick(array)`
  - `weightedPick(items)`
- Replaced core domain models in `src/game/types.ts` with explicit primitives:
  - `GameState`
  - `WeekSchedule` (7-day tuple)
  - `DayAssignment` (duty type + shift)
  - `PlayerStats` (`warmth`, `stamina`, `injury`, `hunger`, `sanity`)
  - `CampStats` (`supplies`, `morale`, `discipline`, `rumor`)
  - `NPCProfile`
  - `PatrolReport` (including hidden `isLying`)
  - `NightLog` (`events`, `deltas`, `reports`, `flags`)
  - `ThreatSeed` enum (`REAL`, `EXAGGERATED`, `NONE`) under hidden game state
- Added comprehensive Zod schemas in `src/game/schema.ts` for:
  - all new domain models
  - save envelope v2 validation
  - legacy save envelope v1 parsing
- Added save migration path in `src/game/migrations.ts`:
  - v1 (`snapshot`) -> v2 (`gameState`) mapping
  - migration output revalidated by v2 game schema
- Updated localStorage persistence wiring in `src/utils/storage.ts`:
  - load validates and auto-migrates legacy saves
  - migrated payload is rewritten to v2
- Updated simulation/store wiring:
  - `src/game/simulation.ts` now operates on `GameState`
  - `src/state/useGameStore.ts` now stores `GameState`
- Added/updated tests:
  - `src/utils/rng.test.ts` (determinism + weightedPick correctness/bias)
  - `src/game/simulation.test.ts` adjusted to `GameState`
- Validation:
  - `npm run test`: pass (6 tests)
  - `npm run build`: pass
  - `npm run check`: pass

## 2026-02-25 - Week Scheduler + Daily Disruption systems
- Implemented weekly duty scheduling with explicit slot types:
  - `PATROL`
  - `CAMP_WORK`
  - `CAMP_WAIT`
  - `NIGHT_WATCH`
  - `REST`
- Scheduler guarantees 1-3 `PATROL` days per week (`generateWeekSchedule`).
- Added day-phase flow to `GameState`:
  - `todayIndex` (0-6)
  - `phase` (`DAY` or `NIGHT`)
  - `schedule` (7-day week schedule)
- Added disruption system (`applyDailyDisruption`) with 25-40% daily chance:
  - Fill-in patrol (`FILL_IN_PATROL`)
  - Swap (`SWAP`) between patrol and camp-side duties
  - Extra duty (`EXTRA_DUTY`) adding `NIGHT_WATCH` sanity/stamina pressure
- Each day assignment now stores:
  - scheduled duty/shift
  - assigned duty/shift after disruption
  - disruption metadata (`type`, `chance`, `reason`, `extraDuty`)
- Updated gameplay actions:
  - `Advance to Night` resolves the current day into a `NightLog` and sets `phase=NIGHT`.
  - `Next Day` only works from `phase=NIGHT`; advances `todayIndex`, applies new-day disruption, and re-enters `phase=DAY`.
- UI wiring updates:
  - Schedule Board now shows scheduled duty and disruption-adjusted duty.
  - Today panel now shows:
    - disruption banner + reason (if disrupted)
    - `Advance to Night` button
    - `Next Day` button (disabled until night phase)
- Save schema + migration updated:
  - current save envelope moved to v3
  - migration path supports v1 -> v3 and v2 -> v3
  - legacy data mapped into new `schedule/todayIndex/phase/disruption` state model

## 2026-02-25 - Tests added/updated for this task
- `src/game/simulation.test.ts`
  - scheduler constraints: exactly 7 days, and 1-3 patrol days
  - disruption outcomes: chance bounds and type-specific invariants
  - phase actions: `Next Day` blocked before night resolve, allowed after `Advance to Night`
- Existing RNG tests retained and passing.

## 2026-02-25 - Validation
- `npm run test`: pass
- `npm run build`: pass
- `npm run check`: pass
- Playwright smoke capture against Vite dev server:
  - `output/ui-shell-v2/shot-0.png` generated
  - no `errors-*.json` emitted in that run

## 2026-02-25 - Core night loop implementation (DAY -> NIGHT_SCENE -> DAWN_REPORT)
- Implemented full daily playable flow for 1-week slice:
  - `DAY` screen: assignment + disruption + `Begin Night` action.
  - `NIGHT_SCENE` screen:
    - `PATROL`: route text, procedural event outcome, 3 decision options.
    - `CAMP`: internal event + explicit `Wait for patrol return` step.
  - `DAWN_REPORT` screen:
    - "What changed since yesterday?" deltas for supplies/morale/discipline/rumor/warmth/stamina/sanity/injury.
    - `Start Next Day` action to advance calendar.
- Added 10 procedural starter event cards in `src/content/events.ts` with required tags:
  - tags used across set: `mundane`, `ambiguous`, `hazard`, `internal`.
- Night resolution now:
  - Applies card + choice + threat + disruption penalties deterministically.
  - Generates patrol debrief reports and conflict flags.
  - Propagates rumor/discipline/morale pressure from debrief conflicts.
  - Writes `NightLog` and appends dawn summary to recent log.
- Updated game state model and persistence plumbing:
  - `phase`: `DAY | NIGHT_SCENE | DAWN_REPORT`
  - `activeNightScene` and `dawnReport` added to `GameState`.
  - Save schema/version migrated to v4.
  - Added migration path for legacy v3/v2/v1 payloads into new phase model.
- Updated Zustand actions:
  - `beginNight`
  - `resolveNight(choiceId?)`
  - `startNextDay`
- Added UI components:
  - `src/ui/NightScenePanel.tsx`
  - `src/ui/DawnReportPanel.tsx`
- Added test coverage updates (`src/game/simulation.test.ts`):
  - DAY->NIGHT_SCENE->DAWN_REPORT->DAY gating and progression.
  - Patrol scene options count constraint (2-3).

## 2026-02-25 - Playwright validation loop (develop-web-game skill)
- Added `window.render_game_to_text` and `window.advanceTime(ms)` exposure in app for automated probing.
- Executed Playwright client loops against Vite dev server and inspected screenshots + text state:
  - `output/night-loop-1/shot-0.png` (DAY screen with disruption banner)
  - `output/night-loop-1/shot-1.png` (CAMP night scene)
  - `output/night-loop-patrol/shot-0.png` (PATROL night scene with 3 decisions)
  - `output/night-loop-dawn/shot-0.png` (DAWN_REPORT deltas + Start Next Day)
- Verified corresponding text snapshots:
  - `output/night-loop-1/state-0.json`
  - `output/night-loop-1/state-1.json`
  - `output/night-loop-patrol/state-0.json`
  - `output/night-loop-dawn/state-0.json`
- Console error artifacts check:
  - No `errors-*.json` files generated in these Playwright output dirs.

## TODO / suggestions for next agent
- Add optional keyboard shortcuts for in-scene decision selection (currently mouse-first, with deterministic default option fallback).
- Add explicit debrief conflict UI (show conflicting report snippets + source NPC names).
- Add end-of-week summary screen with win/fail framing and stat trend recap.

## 2026-02-25 - Returning patrol debriefs + rumor propagation core
- Implemented psychological debrief loop centered on CAMP nights.
- NPC roster generation upgraded:
  - run-start roster now generates 8-14 deterministic NPCs with stable IDs (`npc-1..npc-n`).
  - expanded role and name pools for variety.
- CAMP debrief system:
  - on CAMP night scenes, patrol returns with 2-4 NPC reports.
  - report claims are drawn from fixed pool:
    - tracks in snow
    - distant light
    - howl
    - missing man
    - nothing unusual
    - strange symbol
  - hidden truth per report is generated from `ThreatSeed` + NPC fear/belief.
  - low player sanity now darkens report wording (`presentedClaim`) while preserving hidden truth.
  - conflicts can emerge between report claims (e.g., nothing unusual vs alarming claim).
- Post-debrief player choices implemented:
  - `Escalate to commander` (discipline+, morale-, rumor+)
  - `Downplay` (discipline-, morale+, rumor-)
  - `Investigate quietly` (sets `investigationFocus` flag; biases next patrol toward hazard/ambiguous encounters)
  - `Accuse liar` (trust shifts in NPC profiles, sets pending conflict risk)
- Rumor propagation system:
  - debrief claims convert to `RumorPacket`s.
  - packets spread across roster based on fear, belief, discipline, and player choice modifier.
  - tracked per-NPC adoption state (`adopted/heardCount/spreadCount/lastHeardDay`).
  - daily rumor reach count is computed and surfaced in Dawn Report.
- Added delayed accusation backlash event potential on later camp nights via hidden pending conflict flag.
- Dawn report now includes `rumorReachCount` in both data and UI.

## 2026-02-25 - Developer Panel expansion
- Added always-open in-app developer panel with:
  - `ThreatSeed`
  - investigation/conflict hidden flags
  - per-NPC rumor adoption metrics
  - last debrief truth-vs-claim view (hidden debug information)

## 2026-02-25 - Save schema + migration update
- Save version advanced to v5.
- Added schema coverage for:
  - rumor packets
  - expanded patrol report fields (`npcName`, `truthObservation`, `presentedClaim`)
  - night log debrief metadata and rumor reach
  - hidden rumor network/debrief state
- Added migration path v4 -> v5 plus normalization from older versions.

## 2026-02-25 - Test coverage added
- `src/game/simulation.test.ts` now validates:
  - roster size and deterministic stable IDs
  - CAMP debrief report count and fixed claim pool usage
  - rumor propagation updates + rumor reach visibility on dawn report
  - investigate-quietly flag influencing next patrol and decrementing after use

## 2026-02-25 - Validation
- `npm run test`: pass (11 tests)
- `npm run build`: pass
- Playwright validation loops (with screenshot + text-state artifacts):
  - `output/debrief-rumor-loop/` (multi-day rumor reach and dawn reports)
  - `output/debrief-camp-scene/` (camp debrief scene with 4 response choices)
  - `output/debrief-camp-with-dev/` (camp scene + expanded developer panel)
  - `output/debrief-dev-after-resolve/` (developer panel showing truth-vs-claim + per-NPC adoption after resolved debrief)
- No Playwright `errors-*.json` files emitted in those runs.

## TODO / suggestions for next agent
- Add named NPC labels directly in schedule/log debrief summaries (currently detailed names are most visible in scene + dev panel).
- Add explicit UI explanation for rumor reach mechanics to support future balance tuning.
- Consider a compact graph visualization of rumor packets/adoption edges in developer panel.

## 2026-02-26 - ThreatSeed integration + sanity distortion completion
- Fully integrated hidden `ThreatSeed` weighting into nightly simulation:
  - patrol/camp event weighting now factors threat seed and day escalation curve
  - debrief truth quality (accurate vs mistaken vs lying) now depends on threat seed + NPC trait bias + trust
  - threat seed is assigned at run start via deterministic weighted pick and remains stable for run lifetime
- Added explicit sanity-presentation layer separation:
  - truth state remains in hidden simulation fields (`truthObservation`, actual card/event outcomes)
  - presentation fields are derived into scene-only UI payload:
    - `presentedRouteDescription`
    - `presentedOutcome`
    - `falsePerceptionOverlay` (occasional)
    - `distortionLevel` (`NONE` | `UNEASY` | `SEVERE`)
  - low sanity increases ominous phrasing + overlay chance without mutating underlying truth
- Deterministic RNG stream separation:
  - presentation RNG is decoupled from truth RNG to prevent low-sanity rendering changes from affecting simulation outcomes
  - same seed now reproduces identical hidden truth even when sanity differs
- UI updates:
  - night scene now renders presentation text and optional "Perception drift" notice
  - `window.render_game_to_text` emits distortion metadata for automated checks
- Schema/migration updates:
  - night scene schema defaults include the new presentation fields so older saves remain loadable

## 2026-02-26 - Tests and validation
- Tests:
  - `npm run test` -> pass (13 tests)
  - added deterministic truth test (same seed => same hidden outcomes)
  - added sanity separation test (presentation diverges while truth/log truth remains identical)
- Build:
  - `npm run build` -> pass
- Playwright loop:
  - Fresh run: `output/threat-seed-sanity-check/`
    - `shot-0.png` (PATROL night scene)
    - `shot-1.png` (next day DAY panel after resolve)
    - `state-0.json` / `state-1.json` confirm expected phase transitions and hidden `threatSeed`
  - Distortion evidence artifact:
    - `output/threat-sanity-loop-distorted/state-0.json` shows `distortionLevel: "UNEASY"` with low sanity
  - No `errors-*.json` generated in inspected threat/sanity output folders.

## TODO / suggestions for next agent
- Add a dedicated automated action payload that reliably reaches a low-sanity night scene in one run (for easier CI-level screenshot verification of distortion overlays).
- Consider exposing a tiny `debug/autoplay` control path in dev mode only, to make Playwright scene traversal less selector-dependent in this non-canvas UI.

## 2026-02-26 - Content expansion + pacing + week summary
- Expanded event content to a 60-card catalog in `src/content/events.ts` with explicit category buckets:
  - mundane: 20
  - ambiguous signs: 15
  - hazards: 10
  - internal conflict: 10
  - rare shock: 5
- Added category exports (`eventCardCatalog`) and retained flattened runtime list (`nightEventCards`) for simulation selection.
- Mundane cards now use low baseline deltas and calmer outcomes, enabling low-pressure nights in regular flow.

- Added pacing controller in simulation:
  - Introduced hidden `intenseStreak` state.
  - Intense events defined as tags containing `hazard`, `internal`, or `shock`.
  - Event selection now applies cooldown logic:
    - if `intenseStreak >= 2`, selector uses a cool-down pool biased away from intense cards.
  - `intenseStreak` increments on intense nights and resets on calm nights.

- Added calm-day support in CAMP debrief logic:
  - Calm camp nights bias truth generation toward `nothing unusual`.
  - Calm nights avoid forced contradiction injection.
  - Guarantees at least one `nothing unusual` claim when calm debriefs would otherwise lack it.
  - Added calm log line and debrief calm summary line on resolve.

- Added end-of-week screen flow:
  - New phase: `WEEK_SUMMARY`.
  - After Day 7 dawn, `Start Next Day` transitions to `WEEK_SUMMARY` instead of returning to `DAY`.
  - New `WeekSummary` model includes:
    - nights survived
    - collapse indicators (morale low, discipline low, rumor high)
    - first-break diagnosis (`What broke first?`)
    - shareable summary text
  - Added `WeekSummaryPanel` UI with copy-to-clipboard button.
  - Dawn report button now reads `View Week Summary` on day 7.

- Save/migration updates:
  - Save version bumped to v6.
  - Added migration acceptance for v6 and upgrade-from-v5 rewrite path.
  - Hidden state now hydrates `intenseStreak` default.
  - `weekSummary` is schema-backed with null default for legacy saves.

- Dev/state visibility:
  - Developer panel now shows `intenseStreak`.
  - `window.render_game_to_text` now includes `weekSummary` payload and hidden `intenseStreak`.

## 2026-02-26 - Validation
- `npm run test`: pass (19 tests)
  - Added content-count tests and low-intensity mundane checks (`src/content/events.test.ts`).
  - Added pacing, calm-debrief, and week-summary transition tests (`src/game/simulation.test.ts`).
- `npm run build`: pass.
- Playwright loop:
  - Added action payload: `test-actions/week-summary-loop.json`.
  - Captured final week-summary screen artifact:
    - `output/week-summary-loop/shot-0.png`
    - `output/week-summary-loop/state-0.json`
  - `render_game_to_text` confirms phase `WEEK_SUMMARY` and populated summary diagnostics.
  - No `errors-*.json` generated for the run.

## 2026-02-26 - Playtesting polish pass
- Added a dedicated `RUN_JOURNAL` app screen:
  - New component: `src/ui/RunJournalScreen.tsx`.
  - Lists each day with assignment, disruption reason, night summary, and dawn deltas.
  - Added title and in-run entry points (`Run Journal` buttons).
  - Added keyboard shortcut: `B` toggles GAME <-> RUN_JOURNAL for quick review during tests.

- Added export tooling from Run Journal:
  - `Download JSON` exports a structured payload including `toSaveEnvelope(run)` and flattened journal entries.
  - `Copy Share Text` writes a full run summary to clipboard, with a `.txt` download fallback.
  - Added run-text/journal shaping helpers: `src/game/journal.ts`.

- Accessibility baseline features added and persisted:
  - `Large font mode`
  - `Reduce motion`
  - `High contrast mode`
  - plus existing `Compact log rows`
  - Wired via Zustand settings in `src/state/useGameStore.ts` and persisted in localStorage via `src/utils/storage.ts`.
  - App-level classes in `src/app/App.tsx` + styles in `src/index.css`.

- Added tooltip support for stats and consequence hints:
  - Stats panel now includes per-stat tooltip help describing impact/collapse implications.
  - Night decision options now include consequence tooltips summarizing predicted stat deltas.

- Migration safety hardening:
  - Added migration tests: `src/game/migrations.test.ts`.
  - Verified current envelopes load without migration and v5-like envelopes upgrade with defaulted fields.
  - This guards existing localStorage runs from breaking during schema evolution.

- README refreshed:
  - Updated `README.md` with concise run/test/build instructions and core logic map.

## 2026-02-26 - Final validation for polish pass
- `npm run test`: pass (21 tests).
- `npm run build`: pass.
- Playwright artifacts:
  - Run Journal screen: `output/run-journal-screen/shot-0.png` + `state-0.json`.
  - Settings (accessibility controls): `output/settings-a11y-screen/shot-0.png` + `state-0.json`.
  - Setup flow: `output/journal-seed-setup/`.
  - No `errors-*.json` generated in new output folders.

## 2026-02-26 - Architectural + systems integrity pass
- Scope held to integrity/stability/clarity only (no new gameplay mechanics).

### 1) System coherence audit
- Fixed a core contradiction in patrol report generation:
  - mistaken/lying patrol claims now correctly branch from the underlying truth observation.
  - previously, one path could randomly diverge from truth selection in a way that could accidentally align claim/truth unexpectedly.
- Strengthened deterministic disruption logic:
  - disruptions now use a deterministic weekly disruption plan (target 1-3 days/week).
  - removed contradictory disruption states (e.g., fill-in patrol on already-patrol day, extra duty stacked on scheduled night-watch duty).
- Added inline domain documentation in `src/game/types.ts` for:
  - `ThreatSeed`
  - `RumorPacket`
  - `NightLog`
  - debrief truth-vs-claim-vs-presentation separation in `PatrolReport`.
- Developer Panel isolation improved:
  - now collapsed by default (`<details>` not open).
  - hidden truth remains accessible there, not in normal player panels.

### 2) Simulation stability + deterministic reproducibility
- Added new stability and coherence tests in `src/game/simulation.test.ts`:
  - disruption plan stays in 1-3/week.
  - no contradictory reassignment outcomes.
  - 100-seed week completion loop without deadlocks.
  - dawn delta values always finite.
  - full week deterministic reproducibility for identical seed + default choices.
- Kept prior sanity-distortion isolation guarantees (presentation changes do not mutate hidden truth state).

### 3) Pacing & early-week collapse control
- Rebalanced event weighting in `eventWeightForThreat(...)`:
  - stronger early-week mundane bias.
  - lower early-week intensity pressure.
  - shock events remain rare, especially before midweek.
  - investigation bias still increases encounter pressure but with moderated boost.
- Rebalanced threat pressure in `threatModifierForEvent(...)`:
  - softened penalties for days 1-2 to reduce runaway early collapse while preserving escalation later.
- Existing pacing streak guard retained and strengthened to prevent intense-night chaining.

### 4) Codebase hardening / cleanup
- Removed dead artifacts from older prototype iterations:
  - deleted `/game.js`
  - deleted `/tools/web_game_playwright_client.local.js`
  - removed obsolete platformer-era action payloads from `test-actions/`.
- Added `runSimulationReport(...)` in `src/game/simulation.ts`:
  - runs seeded batch simulations (default 100 runs),
  - returns aggregates and logs report metrics to console for balancing.
- Exposed report helper in browser console via `window.run_simulation_report(...)`.

### 5) Migration/version safety
- Existing v6 save path kept intact.
- Added migration continuity tests in `src/game/migrations.test.ts`:
  - current-version payload load without migration.
  - v5-like payload upgrade with defaulted new fields preserved safely.

### 6) Documentation refresh
- README rewritten with requested sections:
  - architecture overview
  - core loop
  - determinism model
  - pacing tuning points
  - safe event-card expansion guide
  - design philosophy statement.

## 2026-02-26 - Integrity pass validation
- `npm run test`: pass (27 tests).
- `npm run build`: pass.
- Playwright post-refactor smoke:
  - `output/integrity-pass-week-loop/shot-0.png`
  - `output/integrity-pass-week-loop/state-0.json` (week summary reached; no regressions observed)
  - no `errors-*.json` generated in this output folder.
