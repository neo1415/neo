// Read-only snapshots of shared projects for the safe project viewer. Fictional code and pages.
// Nothing here is executed: code is shown as text, pages render in a sandboxed frame with scripts off.
export interface ProjectSnapshot {
  kind: 'code' | 'page';
  where: string;
  github?: boolean;
  files?: { path: string; code: string }[];
  html?: string;
  links: string[];
  explain: { summary: string; shows: string[]; doesNot: string[] };
}

export const PROJECTS: Record<string, ProjectSnapshot> = {
  e_tobi_go: {
    kind: 'code', where: 'github.com/tobi-adeyemi/idem', github: true,
    links: ['https://github.com/tobi-adeyemi/idem', 'https://pkg.go.dev/github.com/tobi-adeyemi/idem'],
    files: [
      { path: 'idem.go', code: `// Package idem makes a payment request safe to retry.\npackage idem\n\n// Do runs fn once per key. A retry with the same key returns\n// the first result instead of paying twice.\nfunc (s *Store) Do(ctx context.Context, key string, fn func() (Result, error)) (Result, error) {\n\tif r, ok, err := s.get(ctx, key); err != nil {\n\t\treturn Result{}, fmt.Errorf("idem: lookup %q: %w", key, err)\n\t} else if ok {\n\t\treturn r, nil // already done: don't run fn again\n\t}\n\tunlock, err := s.lock(ctx, key)\n\tif err != nil {\n\t\treturn Result{}, ErrInFlight\n\t}\n\tdefer unlock()\n\tr, err := fn()\n\tif err != nil {\n\t\treturn Result{}, err // not saved, so a retry can try again\n\t}\n\treturn r, s.put(ctx, key, r)\n}` },
      { path: 'idem_test.go', code: `func TestRetryDoesNotPayTwice(t *testing.T) {\n\ts := newTestStore(t)\n\tcalls := 0\n\tpay := func() (Result, error) { calls++; return Result{ID: "pay_1"}, nil }\n\ts.Do(ctx, "order-42", pay)\n\ts.Do(ctx, "order-42", pay)\n\tif calls != 1 {\n\t\tt.Fatalf("paid %d times, want 1", calls)\n\t}\n}` },
    ],
    explain: {
      summary: 'A small Go library that stops a payment from going through twice when a request is retried.',
      shows: ['He understands the most common way payment systems lose money: retries that pay twice.', 'Errors are handled explicitly and explained, which makes problems easier to find.', 'There is a test that proves the “never pay twice” rule.'],
      doesNot: ['That he has run this inside a busy live service: it’s a library, not a running system.', 'How it behaves under heavy load or when the database is slow.', 'Whether he wrote all of it alone (the public history shows one author, but Q can’t confirm identity).'],
    },
  },
  e_tobi_recon: {
    kind: 'code', where: 'Shared repository snapshot (14 Aug 2026)',
    links: [],
    files: [{ path: 'recon/match.go', code: `// Match pairs each card settlement with a ledger entry.\n// Anything unmatched after the window is flagged for a person to check.\nfunc Match(settlements []Settlement, ledger Index, window time.Duration) Report {\n\tvar rep Report\n\tfor _, s := range settlements {\n\t\tif e, ok := ledger.Find(s.Reference, s.Amount); ok {\n\t\t\trep.Matched = append(rep.Matched, Pair{s, e})\n\t\t\tcontinue\n\t\t}\n\t\tif time.Since(s.SettledAt) > window {\n\t\t\trep.Flagged = append(rep.Flagged, s) // money may be missing\n\t\t}\n\t}\n\treturn rep\n}` }],
    explain: {
      summary: 'The core of a job that checks every card settlement against the company’s ledger and flags anything that doesn’t match.',
      shows: ['He built the part of a payments system that catches missing or mismatched money.', 'The design is simple and readable: match, otherwise wait, otherwise flag for a person.', 'Q checked this snapshot against the repository it came from (verified).'],
      doesNot: ['The “4 million a day” volume: that number is self-reported.', 'How the flagged items were handled by the team afterwards.'],
    },
  },
  e_zara_api: {
    kind: 'code', where: 'github.com/zara-mensah/fleet-api', github: true,
    links: ['https://github.com/zara-mensah/fleet-api'],
    files: [{ path: 'ingest/handler.go', code: `// Ingest accepts batches of GPS pings from vehicles.\nfunc (h *Handler) Ingest(w http.ResponseWriter, r *http.Request) {\n\tvar batch []Ping\n\tif err := json.NewDecoder(r.Body).Decode(&batch); err != nil {\n\t\thttp.Error(w, "bad batch", http.StatusBadRequest)\n\t\treturn\n\t}\n\tif err := h.store.SaveBatch(r.Context(), batch); err != nil {\n\t\th.log.Error("save batch", "err", err, "n", len(batch))\n\t\thttp.Error(w, "try again", http.StatusServiceUnavailable)\n\t\treturn\n\t}\n\tw.WriteHeader(http.StatusAccepted)\n}` }],
    explain: {
      summary: 'A Go web service that receives location updates from delivery vehicles and stores them.',
      shows: ['She writes Go web services, not just scripts.', 'Failures are logged and the sender is told to try again, which is the right habit for live systems.'],
      doesNot: ['Anything about payments or money.', 'Whether it ran with real traffic: the repository doesn’t say.', 'Whether the repository is really hers: the GitHub check hasn’t completed.'],
    },
  },
  e_hb_tobi_site: {
    kind: 'page', where: 'tobi-builds.example (snapshot, 18 Sep 2026)',
    links: ['https://tobi-builds.example/settlements', 'https://status.lumen-pay.example'],
    html: `<!doctype html><html><head><meta charset="utf-8"><style>body{font:15px/1.5 system-ui,sans-serif;margin:0;padding:20px;color:#16140f;background:#fffdf8}h1{font-size:20px;margin:0 0 8px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #dcd2bf;padding:8px;text-align:left}.ok{color:#2f6b3a}.late{color:#8a5a00}a{color:#2f5a94}</style></head><body><h1>When will my settlement land?</h1><p>Merchant view · last updated 09:40</p><table><tr><th>Batch</th><th>Amount</th><th>Status</th></tr><tr><td>Mon 14 Sep</td><td>₦4,210,000</td><td class="ok">Settled</td></tr><tr><td>Tue 15 Sep</td><td>₦3,980,500</td><td class="late">Delayed: bank holiday</td></tr></table><p><a href="https://status.lumen-pay.example">Full status history</a></p><script>document.body.innerHTML='tracking you';</script></body></html>`,
    explain: {
      summary: 'A page merchants use to see when their money will arrive, with plain status words.',
      shows: ['He thinks about what merchants need to know, in plain words.', 'He designs for the “delayed” case, not only the happy path.'],
      doesNot: ['How the numbers behind it were calculated.', 'Any code: this is a picture of a page, not the system.', 'The page contained a script; the viewer switched it off, so Q can’t say what it did.'],
    },
  },
};

/** Make a page snapshot inert: no scripts, no live links, no outside requests. */
export function inertHtml(html: string) {
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">`;
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '<span style="text-decoration:underline">$1</span>')
    .replace(/<head>/i, `<head>${csp}`);
}
export const scriptCount = (html: string) => (html.match(/<script/gi) ?? []).length;
export const domainOf = (url: string) => { try { return new URL(url).hostname; } catch { return url; } };
