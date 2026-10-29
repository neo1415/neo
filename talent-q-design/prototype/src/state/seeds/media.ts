// MEDIA seed (audit addendum §F, J11 step 7). Tobi's "Reconciliation service walkthrough" is a recording on his
// own device: the journey uploads it (nothing is in the store until he adds it and consents). These constants are
// what the simulated upload "contains": a 6:00 video, its content hash, a timed transcript of 25 lines and three
// parts. KEY_MOMENTS is the output of the simulated analysis for this content hash, stated per topic so it can be
// mapped onto whatever rubric version Kora approves (it is authored for the prototype, never claimed as AI output).
import type { SeedPatch } from '../../mock/world';

export const SAMPLE = {
  mediaId: 'm_tobi_recon',
  evidenceId: 'e_tobi_video',
  ownerId: 'p_tobi',
  title: 'Reconciliation service walkthrough',
  file: 'reconciliation-walkthrough.mp4',
  sizeMb: 148,
  parts: 10,
  duration: 360,
  contentHash: 'sha256:9f2c…demo',
};

export const SEGMENTS = [
  { id: 's1', t: 0, tEnd: 130, label: 'Payments reconciliation' },
  { id: 's2', t: 130, tEnd: 220, label: 'Client dashboard (confidential)', confidential: true },
  { id: 's3', t: 220, tEnd: 360, label: 'Postgres tuning' },
];

export const TRANSCRIPT: { t: number; text: string }[] = [
  // 1 · Payments reconciliation (0:00–2:10)
  { t: 0, text: 'Hi, I’m Tobi. This is a walkthrough of the reconciliation service I built at Lumen, the payments company I work for.' },
  { t: 12, text: 'Every night we get settlement files from three card processors, about four million lines a day, and we have to match each one to an entry in our ledger.' },
  { t: 27, text: 'The matcher is a Go worker. It reads the file in chunks of ten thousand rows and matches on the processor reference first, then on amount and date as a fallback.' },
  { t: 44, text: 'Each chunk has an idempotency key, so if the worker crashes halfway, a retry skips what’s already matched instead of double-counting.' },
  { t: 58, text: 'Anything that doesn’t match goes into an exceptions table with a reason: missing in the ledger, missing in the file, or an amount mismatch.' },
  { t: 73, text: 'The trade-off I made was to match in batches rather than stream. Streaming would be faster, but batches let finance re-run a single day when a processor resends a file.' },
  { t: 90, text: 'Here’s the exceptions report. Before this service, finance found mismatches about three days later. Now it’s within fifteen minutes of the file arriving.' },
  { t: 105, text: 'That’s a number from our own dashboards, so treat it as my report; I can’t show the production metrics here.' },
  { t: 118, text: 'Next I’ll show how the results reach the client teams.' },
  // 2 · Client dashboard, confidential (2:10–3:40)
  { t: 130, text: 'This is the dashboard we built for one of our merchant clients. It shows their real numbers, so I’ve marked this part confidential.' },
  { t: 144, text: 'During an incident in March, settlements from one processor stopped arriving. I was on call that night.' },
  { t: 158, text: 'I paged the processor, switched matching to the backup file feed, and wrote the post-mortem the next morning.' },
  { t: 175, text: 'We added an alert for a missing file after thirty minutes, which has caught the same failure twice since.' },
  { t: 190, text: 'I also walked the client’s finance lead through what happened, without the jargon, so they could explain it to their auditors.' },
  { t: 208, text: 'OK, now the database side.' },
  // 3 · Postgres tuning (3:40–6:00)
  { t: 220, text: 'The exceptions table grew to about two hundred million rows, and the daily report query took nine seconds.' },
  { t: 235, text: 'This is a copy of the database with synthetic data, the same size and shape as production, because I can’t show real customer data.' },
  { t: 248, text: 'Here’s EXPLAIN ANALYZE before: a sequential scan over the whole table, because the filter was on a date inside a JSON column.' },
  { t: 264, text: 'I pulled the settlement date out into its own column, partitioned the table by month, and added an index on processor and date.' },
  { t: 282, text: 'After that, the same query runs in about a hundred and forty milliseconds on this copy.' },
  { t: 296, text: 'The catch with partitioning is that queries without a date filter get slower, so I added a check for that in code review.' },
  { t: 312, text: 'We also move old partitions to cheaper storage after ninety days.' },
  { t: 326, text: 'On production the improvement was similar, but again, that’s my report, not something this video shows.' },
  { t: 340, text: 'If I did it again, I’d add the date column from day one.' },
  { t: 352, text: 'Thanks for watching.' },
];

export type Topic = 'payments' | 'go' | 'postgres' | 'incidents' | 'mentoring' | 'communication' | 'design';
export interface KeyMoment { t: number; tEnd: number }
/** Simulated analysis output for SAMPLE.contentHash: moments per topic, with Q's proposed anchored rating (0–4),
 *  uncertainty and the reason. Ratings rest on what was said and shown on screen; never on face, voice or accent. */
export const KEY_MOMENTS: Record<Topic, { moments: KeyMoment[]; rating?: 0 | 1 | 2 | 3 | 4; uncertainty: 'LOW' | 'MEDIUM' | 'HIGH'; note: string }> = {
  payments: { moments: [{ t: 12, tEnd: 27 }, { t: 58, tEnd: 73 }, { t: 73, tEnd: 90 }, { t: 90, tEnd: 105 }], rating: 3, uncertainty: 'LOW',
    note: 'Shows on screen how settlement lines are matched to the ledger, how exceptions are recorded, and why he chose batches. The 15-minute figure is his own report; the video doesn’t show production metrics.' },
  go: { moments: [{ t: 27, tEnd: 44 }, { t: 44, tEnd: 58 }], rating: 2, uncertainty: 'MEDIUM',
    note: 'Shows one Go worker with chunked reads and idempotent retries. That’s real production design, but one worker is too little to judge Go across a service.' },
  postgres: { moments: [{ t: 220, tEnd: 235 }, { t: 248, tEnd: 264 }, { t: 264, tEnd: 282 }, { t: 282, tEnd: 296 }, { t: 296, tEnd: 312 }], rating: 3, uncertainty: 'MEDIUM',
    note: 'Diagnoses a slow query with EXPLAIN ANALYZE, then partitions and indexes, and names the trade-off. It was done on a synthetic copy (he says so at 3:55); the production effect is his report.' },
  incidents: { moments: [{ t: 144, tEnd: 158 }, { t: 158, tEnd: 175 }, { t: 175, tEnd: 190 }], rating: 3, uncertainty: 'MEDIUM',
    note: 'Describes leading an incident while on call, the fix and the post-mortem, and the alert that followed.' },
  mentoring: { moments: [], uncertainty: 'HIGH', note: 'Nothing in the video is about helping other engineers grow.' },
  communication: { moments: [{ t: 73, tEnd: 90 }, { t: 190, tEnd: 208 }, { t: 296, tEnd: 312 }], rating: 2, uncertainty: 'MEDIUM',
    note: 'Judged on what he said: each step has a reason and the trade-offs are stated plainly. Not judged on accent, fluency, pace or voice.' },
  design: { moments: [{ t: 73, tEnd: 90 }, { t: 264, tEnd: 282 }, { t: 296, tEnd: 312 }], rating: 3, uncertainty: 'MEDIUM',
    note: 'States design choices with their costs: batches over streaming, partitioning and what it slows down.' },
};

/** Nothing goes into the store from here: Tobi adds the video himself in the journey (J11 step 7). */
export const seed: SeedPatch = {};
