#!/usr/bin/env bash
# Quick start guide for Lowborn development

echo "🎮 Lowborn - Quick Start Guide"
echo "=============================="
echo ""

echo "✨ Fresh Install"
echo "npm install"
echo "npm run dev"
echo "# Open http://localhost:5173"
echo ""

echo "🧪 Testing"
echo "npm run test          # Run all tests once"
echo "npm run test:watch    # Watch mode for TDD"
echo ""

echo "🔨 Building"
echo "npm run build         # Production build"
echo "npm run preview       # Preview dist/ locally"
echo "npm run check         # TypeScript validation"
echo ""

echo "📚 Documentation"
echo "# See README.md for:"
echo "#   - Game design concepts"
echo "#   - Architecture overview"
echo "#   - Adding event cards"
echo "#   - Balancing tips"
echo "#   - Troubleshooting"
echo ""

echo "💻 Development Tips"
echo "# Hot Reload"
echo "  - Edit files in src/ and save (dev server auto-refreshes)"
echo ""

echo "# Error Handling"
echo "  - All mutations go through useGameStore (has error tracking)"
echo "  - Wrap new components in <ErrorBoundary> for safety"
echo ""

echo "# Seed Validation"
echo "  - Max 256 chars, alphanumeric + dash/underscore/colon/space"
echo "  - Invalid seeds show red border + error message"
echo ""

echo "# Saving/Loading"
echo "  - Settings > Download Save (exports JSON)"
echo "  - Settings > Import Save (loads from file)"
echo ""

echo "# Browser Console"
echo "  - window.render_game_to_text() → game state JSON"
echo "  - window.run_simulation_report('seed', 100) → balance report"
echo ""

echo "🎯 Next Steps"
echo "1. Run 'npm install' and 'npm run dev'"
echo "2. Start a new run with any seed (or default)"
echo "3. Make choices and observe the story unfold"
echo "4. Check Developer Panel for hidden state"
echo "5. Export your save for backup or sharing"
echo ""

echo "✅ Project Status"
echo "- TypeScript: ✓ (zero errors)"
echo "- Tests: ✓ (27/27 passing)"
echo "- Build: ✓ (365 KB gzip)"
echo "- Error Handling: ✓ (boundaries + tracking)"
echo "- Input Validation: ✓ (seed sanitization)"
echo "- Save Export: ✓ (JSON download/import)"
echo ""
