#!/usr/bin/env bash
# Builds the downloadable product-definition bundle (Talent-Q-Complete.zip) from the repository and a built
# review gallery. Usage: scripts/build-bundle.sh <gallery dir> <out dir>
# Contents: README-FIRST.md, ALL-SPECS.md (every specification joined in reading order), COMMIT.txt,
# founder-sources/ (docs/sources), product-definition/ (this folder without packages, builds or raw captures),
# review-gallery/ (offline gallery with the prototype), films/ (full-quality J11, J12 and master films with clips).
set -euo pipefail
GAL="$1"; OUT="$2"; ROOT=$(cd "$(dirname "$0")/.." && pwd); REPO=$(cd "$ROOT/.." && pwd)
B="$OUT/Talent-Q-Complete"; rm -rf "$B" "$OUT/Talent-Q-Complete.zip"; mkdir -p "$B/films"
git -C "$REPO" log -1 --format='%H %ci %s' > "$B/COMMIT.txt"
cp -r "$REPO/docs/sources" "$B/founder-sources"
# The working folder, minus installed packages, builds, raw test captures and the films (they go in films/).
tar -C "$ROOT" --exclude='prototype/node_modules' --exclude='prototype/dist' --exclude='captures/cx' --exclude='captures/features' \
  --exclude='captures/films' --exclude='*.webm' -cf - . | (mkdir -p "$B/product-definition" && tar -C "$B/product-definition" -xf -)
cp -r "$GAL" "$B/review-gallery"
cp -r "$ROOT/captures/films/J11" "$ROOT/captures/films/J12" "$ROOT/captures/films/master" "$B/films/"
# ALL-SPECS.md: the package index first, then status, handoff, journeys and per-area design notes.
{
  echo "# Talent Q: all specifications in one file"; echo; echo "Generated from the repository at $(cut -c1-12 "$B/COMMIT.txt"). Each section is one file; its path is in the heading."; echo
  for f in PRODUCT-DEFINITION-PACKAGE.md COVERAGE-SUMMARY.md PROGRESS.md DESIGN-SKILL-AUDIT.md design-system/DIRECTION-D-SYSTEM.md components/COMPONENTS.md \
           handoff/MODULE-MAP-AND-ROADMAP.md handoff/Q-INTELLIGENCE-SPEC.md handoff/PRIVACY-AND-PERMISSIONS.md handoff/ADDENDUM-HANDOFF.md \
           handoff/CONSOLIDATION-MERGE-LEDGER.md handoff/DECISION-REGISTER.md handoff/DESIGN-QUALITY-GATE.md handoff/PRODUCTION-VERTICAL-SLICE.md \
           handoff/Q-DEPENDENCY-GRAPH.md journeys/JOURNEY-MAP.md journeys/J11-CONNECTED-JOURNEY.md journeys/J12-EVIDENCE-FIRST.md \
           $(cd "$ROOT" && ls journeys/design/*.md) $(cd "$ROOT" && ls journeys/handoff/*.md 2>/dev/null); do
    [ -f "$ROOT/$f" ] || continue
    echo; echo "---"; echo; echo "<!-- file: $f -->"; sed -E 's/^(#{1,5}) /#\1 /' "$ROOT/$f"
  done
} > "$B/ALL-SPECS.md"
cp "$ROOT/scripts/BUNDLE-README.md" "$B/README-FIRST.md"
(cd "$OUT" && zip -qr Talent-Q-Complete.zip Talent-Q-Complete)
du -sh "$OUT/Talent-Q-Complete.zip"
