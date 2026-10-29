#!/usr/bin/env bash
# Runs all ten journey scripts against one build. Usage: run-all.sh [base=http://localhost:4174/]
# Each script was written by a different builder; this normalises how each takes its address.
BASE="${1:-http://localhost:4174/}"; PORT=$(echo "$BASE" | sed -E 's#.*:([0-9]+).*#\1#')
DIR=$(cd "$(dirname "$0")" && pwd); OUT="$DIR/../../results"; mkdir -p "$OUT"
for j in R1 R2 R3 R4 R5 T1 T2 T3 T4 T5; do
  case $j in
    R1|R2|R5) cmd=(node "$DIR/$j.mjs" "$PORT");;
    R3|R4|T4) cmd=(node "$DIR/$j.mjs" "$BASE");;
    *) cmd=(env BASE="$BASE" node "$DIR/$j.mjs");;
  esac
  timeout 1200 "${cmd[@]}" > "$OUT/$j.log" 2>&1; code=$?
  echo "$j exit=$code pass=$(grep -cE '^PASS' "$OUT/$j.log") fail=$(grep -cE '^FAIL' "$OUT/$j.log")"
done | tee "$OUT/summary.txt"
