#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# bump-version.sh — bump all 32 @nexusts/* packages to a new version.
#
# Usage:
#   bash scripts/bump-version.sh 0.9.2
#
# This updates:
#   - root package.json
#   - packages/*/package.json (all 32 packages)
#   - CHANGELOG.md / CHANGELOG.ko.md (inserts a new version entry)
#
# After running, review the changes, then:
#   git add -A
#   git commit -m "chore: bump to v0.9.2"
#   git tag v0.9.2
#   git push origin main --tags
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

if [ $# -ne 1 ]; then
	echo "Usage: bash scripts/bump-version.sh <new-version>"
	echo "Example: bash scripts/bump-version.sh 0.9.2"
	exit 1
fi

NEW_VERSION="$1"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Validate version format (semver)
if ! echo "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
	echo "❌ Invalid version format: '$NEW_VERSION' (expected semver like 0.9.2)"
	exit 1
fi

echo "🔍 Bumping all packages to v${NEW_VERSION}..."
echo ""

# ── 1. Extract current version from root package.json ──
CURRENT_VERSION="$(grep '"version"' "$ROOT_DIR/package.json" | head -1 | sed 's/.*"version": "\(.*\)",/\1/')"
echo "📦 Current version: v${CURRENT_VERSION} → v${NEW_VERSION}"
echo ""

# ── 2. Update root package.json ──
sed -i '' "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" "$ROOT_DIR/package.json"
echo "  ✅ root/package.json"

# ── 3. Update all packages/*/package.json ──
UPDATED=0
for f in "$ROOT_DIR"/packages/*/package.json; do
	if grep -q "\"version\": \"${CURRENT_VERSION}\"" "$f" 2>/dev/null; then
		sed -i '' "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" "$f"
		echo "  ✅ $(basename "$(dirname "$f")")/package.json"
		UPDATED=$((UPDATED + 1))
	fi
done
echo "  ✅ ${UPDATED} packages updated"

# ── 4. Update CHANGELOG.md (insert new version entry after [Unreleased]) ──
CHANGELOG="$ROOT_DIR/CHANGELOG.md"
TODAY="$(date +%Y-%m-%d)"
if grep -q "\[Unreleased\]" "$CHANGELOG" 2>/dev/null; then
	# Insert after the [Unreleased] section
	sed -i '' '/^## \[Unreleased\]$/a\
\
---\
\
## ['"$NEW_VERSION"'] — '"$TODAY"'\'$'\n''\
### Added\'$'\n''\
\'$'\n''- (none)\'$'\n''\
\'$'\n''### Fixed\'$'\n''\
\'$'\n''- (none)\'$'\n' "$CHANGELOG"
	echo "  ✅ CHANGELOG.md"
fi

# ── 5. Update CHANGELOG.ko.md ──
CHANGELOG_KO="$ROOT_DIR/CHANGELOG.ko.md"
if grep -q "\[Unreleased\]" "$CHANGELOG_KO" 2>/dev/null; then
	sed -i '' '/^## \[Unreleased\]$/a\
\
---\
\
## ['"$NEW_VERSION"'] — '"$TODAY"'\'$'\n''\
### 추가\'$'\n''\
\'$'\n''- (없음)\'$'\n''\
\'$'\n''### 수정\'$'\n''\
\'$'\n''- (없음)\'$'\n' "$CHANGELOG_KO"
	echo "  ✅ CHANGELOG.ko.md"
fi

echo ""
echo "🎉 Done! All packages bumped to v${NEW_VERSION}"
echo ""
echo "Next steps:"
echo "  git add -A"
echo "  git commit -m \"chore: bump to v${NEW_VERSION}\""
echo "  git tag v${NEW_VERSION}"
echo "  git push origin main --tags"
