# Lowborn

Lowborn is a deterministic single-player frontier-watch simulation game. Manage camp resources, interpret patrol reports, and navigate escalating psychological pressure as reality becomes ambiguous.

## Quick Start

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` and start a new run. Optionally provide a seed to reproduce runs.

## ✨ Features

### Core Gameplay
- **7-day week simulation** with procedural schedule disruptions
- **Dual truths system** - hidden threat seed (REAL/EXAGGERATED/NONE) creates persistent uncertainty
- **Sanity distortion** - low sanity alters perception, not underlying reality
- **Debrief scenes** - respond to NPC patrol reports with escalate/downplay/investigate/accuse
- **Rumor propagation** - claims spread through camp affecting morale and discipline

### Player Experience
- **4 Accessibility modes**: Compact log, Large font, Reduce motion, High contrast
- **Save/Load** with persistent storage and file export/import
- **Run Journal** - replay completed runs without re-simulation
- **Developer Panel** - view hidden threat seed, truth observations, NPC adoption
- **Keyboard shortcuts** - Press `B` to toggle journal, `Enter` for actions

### Quality & Robustness ✓ (NEW)
- **Error boundaries** - graceful UI fallbacks for rendering errors
- **Input validation** - seed field sanitization with live feedback
- **Try-catch error handling** - all game transitions have error recovery
- **Type safety** - full TypeScript with Zod schema validation
- **27 passing tests** - deterministic simulation, disruption logic, stat calculations
- **Export/Import saves** - share and backup game states as JSON files
- **JSDoc documentation** - comprehensive inline documentation for core systems

## Commands

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Production build (dist/)
npm run preview      # Preview production build locally
npm run check        # TypeScript type checking
npm run test         # Run vitest suite (27 tests)
npm run test:watch   # Watch mode for tests
```

## Architecture

### Core Systems (`src/game/`)
- **types.ts** - Domain entities (GameState, NightScene, PatrolReport, etc.)
- **schema.ts** - Zod validation for save/load serialization
- **simulation.ts** - Main engine (~1,856 lines; see refactoring notes)
- **migrations.ts** - Save format versioning and backward compatibility

### State Management (`src/state/`)
- **useGameStore.ts** - Zustand store with error tracking and export/import actions

### UI (`src/ui/`)
- **App.tsx** - Main router with error boundary wrapper
- **MainGameScreen.tsx** - Primary game view (orchestrates sub-panels)
- **NightScenePanel.tsx** - Event resolution interface
- **DawnReportPanel.tsx** - Debrief response choices
- **RunJournalScreen.tsx** - Run replay/history
- **SettingsScreen.tsx** - Accessibility + save management
- **ErrorBoundary.tsx** - React error recovery ✓ (NEW)
- **KeyboardShortcuts.tsx** - Control reference ✓ (NEW)

### Content (`src/content/`)
- **events.ts** - ~50 event cards with tags, stat deltas, observation pools
- **npcs.ts** - 10 NPC templates with roles/attitudes
- **names.ts** - Frontier name pools

### Utilities (`src/utils/`)
- **rng.ts** - Seeded PCG pseudo-random generator
- **storage.ts** - localStorage persistence + SSR safety
- **helpers.ts** - Math utilities (clamp, withSign)
- **saveExport.ts** - File download/import handlers ✓ (NEW)

## Game Design

### Threat Seed
Hidden value determines threat interpretation:
- **REAL**: Dangers are mostly genuine; reports are usually truthful
- **EXAGGERATED**: Mixed truth with amplified social pressure; more lies/mistakes
- **NONE**: Most claims are noise or misinterpretation; low actual threat

### Disruption Mechanics
1. Each week, 1-3 days are assigned disruptions
2. Disruption types: SWAP (duty change), FILL_IN_PATROL, EXTRA_DUTY
3. Weighted by scheduled duty type (patrols more likely to swap/fill-in)
4. Can trigger debrief conflicts and rumor spirals

### Debrief System
1. Patrol/Camp reports submitted with claimed observations
2. Hidden truth stored separately (only visible in dev panel)
3. Player can: ESCALATE_COMMANDER (boost discipline), DOWNPLAY (reduce spread), INVESTIGATE_QUIETLY (reveal truth), ACCUSE_LIAR (risk accusation fallout)
4. Each choice affects NPC trust, camp stats, and rumor intensity

### Rumor Propagation
- Rumors generated from patrol claims with intensity scalar
- "Adopted by" tracks which NPCs believe the rumor
- Affects future debrief behavior and morale

### Sanity Distortion
- Sanity < 50 applies "distortion levels" (UNEASY/SEVERE)
- False perception overlays appear in route descriptions
- Alters presentation text only; underlying simulation unchanged

## Determinism & Testing

Every stochastic element uses `createSeededRng(seedKey)` for reproducibility:
- Schedule generation
- Disruption plan
- Event card selection
- NPC report truthfulness
- Rumor spread
- Sanity distortions

**Result**: Same seed + same choices = guaranteed same outcome

**Testing**: 27 tests verify determinism, state transitions, and stat validity

## Recent Improvements ✓

### Error Handling
- Added `ErrorBoundary` React component to catch and gracefully recover from UI crashes
- Wrapped all state mutations in try-catch with error tracking
- Added user-facing error messages in store (`lastError`, `clearError()`)

### Input Validation
- Seed input sanitized: max 256 chars, alphanumeric + dash/underscore/colon/space
- Real-time validation feedback with character count
- Disabled start button if seed is invalid

### Save/Export
- `exportSave()` action to download game state as JSON
- `importSave(json)` to upload previously saved files
- File helper utilities in new `saveExport.ts`
- Settings screen UI for download/import with feedback messages

### Documentation
- Added JSDoc headers to core functions (simulation, storage, helpers)
- Created `KeyboardShortcuts.tsx` component with control reference
- Comprehensive README with architecture, design, and troubleshooting

### Type Safety
- Store now tracks `lastError` state with centralized error clearing
- Optional chaining and null checks throughout mutations
- Sealed Zod validation on all imports/exports

## Development

### Adding Event Cards
1. Edit `src/content/events.ts`
2. Use `makeCard(spec)` helper with tags: mundane|ambiguous|hazard|internal|shock
3. Provide `observationPool` and `routeTemplates`
4. Run `npm run test` to validate

### Tuning Game Balance
1. Event weights: `eventWeightForThreat()` in simulation.ts
2. Threat modifiers: `threatModifierForEvent()` in simulation.ts
3. Disruption cadence: `buildWeeklyDisruptionPlan()` in simulation.ts
4. Browser console: `window.run_simulation_report("seed", 100)` for aggregate stats

### Extending UI
- Use error boundary for new components: wrap in `<ErrorBoundary />`
- All game mutations go through useGameStore actions with error handling
- Add accessibility: support font scale, reduce motion, high contrast

## Known Limitations & Future Work

### Refactoring (Recommended)
- **simulation.ts** (~1,856 lines) should split into modules:
  - `scheduleGeneration.ts` - week schedule, disruptions
  - `eventResolution.ts` - night scene logic
  - `debriefLogic.ts` - patrol reports, investigation
  - `rumorSystem.ts` - spread, adoption, conflict
  - `statCalculation.ts` - deltas, dawn reports
- **events.ts** (~918 lines) could extract CardBuilder class for DRY spec generation

### Feature Ideas
- **NPC relationship graph** visualization (adoption edges, trust trends)
- **Rumor investigation mini-game** (gather evidence, counter-claims)
- **Multi-week campaigns** with persistent NPC states
- **Difficulty modifiers** (threat intensity, sanity sensitivity)
- **Playtest metrics** export (choice distributions, collapse points)
- **Autosave slots** with timestamp/seed labels

## Troubleshooting

**Q: My save corrupted after an update**
A: Check browser DevTools > Storage > localStorage for `lowborn.save` key. Try importing a backup file via Settings > Import Save.

**Q: Build errors on M1/M2 Mac**
A: Playwright may need `--use-angle=swiftshader`. Set in `tools/web_game_playwright_client.mjs`.

**Q: How do I access hidden state?**
A: Developer Panel (accessible from main game screen) shows threat seed, investigation focus, and per-NPC adoption/truth.

**Q: Can I share my save with another player?**
A: Yes! Use Settings > Download Save to export as JSON, then share the file. They can import it via Settings > Import Save from File.

## Tech Stack

- **React 19.2** - UI framework
- **TypeScript 5.9** - Type safety
- **Zustand 5** - State management
- **Zod 4** - Schema validation
- **Tailwind CSS 3** - Styling
- **Vite 7** - Build tool
- **Vitest 4** - Test runner
- **Playwright 1.58** - E2E testing

## Credits

Built as a weekend game design prototype exploring mechanical narrative and player agency through systems design.

Audio/art assets: Placeholder (frontier theme under development).
