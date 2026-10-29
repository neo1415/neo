#!/usr/bin/env bash
# Records every journey with film-hook.mjs against one build (two journeys at a time).
# Usage: record-all.sh <recordings dir> [base=http://localhost:4174/]
REC="$1"; BASE="${2:-http://localhost:4174/}"; PORT=$(echo "$BASE" | sed -E 's#.*:([0-9]+).*#\1#')
DIR=$(cd "$(dirname "$0")/../journeys" && pwd); HOOK=$(cd "$(dirname "$0")" && pwd)/film-hook.mjs
mkdir -p "$REC"
run() {
  local j=$1 cmd
  case $j in
    R1|R2|R5) cmd=(node --import "$HOOK" "$DIR/$j.mjs" "$PORT");;
    R3|R4|T4) cmd=(node --import "$HOOK" "$DIR/$j.mjs" "$BASE");;
    *) cmd=(env BASE="$BASE" node --import "$HOOK" "$DIR/$j.mjs");;
  esac
  FILM_OUT="$REC" FILM_ID=$j timeout 3000 "${cmd[@]}" > "$REC/$j.log" 2>&1
  echo "$j exit=$? pass=$(grep -cE '^PASS' "$REC/$j.log") fail=$(grep -cE '^FAIL' "$REC/$j.log")"
}
for pair in "R1 T1" "R2 T2" "R3 T3" "R4 T4" "R5 T5"; do
  set -- $pair; run $1 & run $2 & wait
done | tee "$REC/summary.txt"
