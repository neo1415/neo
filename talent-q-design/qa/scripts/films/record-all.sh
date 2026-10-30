#!/usr/bin/env bash
# Records every journey with film-hook.mjs against one build (two journeys at a time).
# Usage: record-all.sh <recordings dir> [base=http://localhost:4174/]
# PAIRS="R5 T5|T3 T4" re-records only those; PACE_T3=0.35 etc. sets a lighter pace for timer-driven journeys.
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
  rm -rf "$REC/$j-desktop-"* "$REC/$j-phone-"*
  local pv="PACE_$j"; FILM_PACE="${!pv:-1}" FILM_OUT="$REC" FILM_ID=$j timeout 3000 "${cmd[@]}" > "$REC/$j.log" 2>&1
  echo "$j exit=$? pass=$(grep -cE '^PASS' "$REC/$j.log") fail=$(grep -cE '^FAIL' "$REC/$j.log")"
}
IFS="|" read -ra LIST <<< "${PAIRS:-R1 T1|R2 T2|R3 T3|R4 T4|R5 T5|J11 J12}"
for pair in "${LIST[@]}"; do
  set -- $pair; run $1 & [ -n "$2" ] && run $2 & wait
done | tee -a "$REC/summary.txt"
