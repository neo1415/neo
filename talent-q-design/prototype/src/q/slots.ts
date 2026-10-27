// Slot calculation (addendum 08 §2 algorithm): AvailableSlots = WorkingWindows ∩ RecruiterFree ∩ PanelFree
// ∩ CandidateAllowedWindows − Buffers − Constraints, then an interpretable score. Runs on busy intervals only.
import type { BusyInterval, MeetingPreferences, Slot } from '@contracts';

const MIN = 60_000;
const LAGOS_OFFSET_MIN = 60; // Africa/Lagos is UTC+1 all year (no DST).

export interface SlotInput {
  weekStartUtc: string; // Monday 00:00 UTC
  prefs: MeetingPreferences;
  /** Earliest local start from the remembered preference, e.g. "10:00". */
  earliestLocal: string;
  busy: BusyInterval[][];
  candidateTz: string;
  candidateWindow?: { startLocal: string; endLocal: string };
  durationMin: number;
  nowUtc: string;
  max?: number;
}

const hm = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

export function fmt(iso: string, tz: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) {
  return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: tz }).format(new Date(iso));
}
function tzOffsetMin(tz: string, at: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(at);
  const g = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return (Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute')) - at.getTime()) / MIN;
}

export function calculateSlots(i: SlotInput): Slot[] {
  const start = new Date(i.weekStartUtc).getTime();
  const out: Slot[] = [];
  const dur = i.durationMin * MIN;
  const buf = i.prefs.bufferMinutes * MIN;
  const lead = i.prefs.minLeadHours * 60 * MIN;
  const now = new Date(i.nowUtc).getTime();
  const allBusy = i.busy.flat().map((b) => [new Date(b.start).getTime() - buf, new Date(b.end).getTime() + buf] as const);

  for (let d = 0; d < 7; d++) {
    const dayStart = start + d * 1440 * MIN;
    const weekday = ((new Date(dayStart).getUTCDay() + 6) % 7) + 1; // 1 = Monday
    const wh = i.prefs.workingHours.find((w) => w.day === weekday);
    if (!wh) continue;
    const open = Math.max(hm(wh.start), hm(i.earliestLocal));
    const close = hm(wh.end);
    for (let m = open; m + i.durationMin <= close; m += 30) {
      const s = dayStart + (m - LAGOS_OFFSET_MIN) * MIN;
      const e = s + dur;
      if (s - now < lead) continue;
      if (i.prefs.noMeetingBlocks.some((b) => b.day === weekday && m < hm(b.end) && m + i.durationMin > hm(b.start))) continue;
      if (allBusy.some(([bs, be]) => s < be && e > bs)) continue;
      const candOff = tzOffsetMin(i.candidateTz, new Date(s));
      const candLocalMin = ((Math.floor((s - dayStart) / MIN) + candOff) % 1440 + 1440) % 1440;
      if (i.candidateWindow && (candLocalMin < hm(i.candidateWindow.startLocal) || candLocalMin + i.durationMin > hm(i.candidateWindow.endLocal))) continue;
      // Interpretable terms, each 0..1.
      const morning = i.prefs.preferMornings ? Math.max(0, 1 - (m - open) / (close - open)) : 0.5;
      const candHour = candLocalMin / 60;
      const fairness = candHour >= 9 && candHour <= 17 ? 1 : candHour >= 8 && candHour <= 19 ? 0.6 : 0.2;
      const leadDays = (s - now) / (1440 * MIN);
      const leadTime = leadDays < 2 ? 0.6 : leadDays < 6 ? 1 : 0.7;
      const sameDay = out.filter((o) => new Date(o.start).getUTCDate() === new Date(s).getUTCDate()).length;
      const load = Math.max(0.2, 1 - sameDay * 0.4);
      const startIso = new Date(s).toISOString();
      out.push({
        slotId: `slot_${startIso.slice(5, 16).replace(/[-:T]/g, '')}`,
        start: startIso,
        end: new Date(e).toISOString(),
        terms: { availabilityPreference: round(morning), timezoneFairness: fairness, leadTime, panelLoadBalance: round(load) },
        candidateLocal: fmt(startIso, i.candidateTz),
        recruiterLocal: fmt(startIso, 'Africa/Lagos'),
        dstNote: candOff !== tzOffsetMin(i.candidateTz, new Date(now)) ? 'Clocks change for the candidate before this date; times shown already account for it.' : undefined,
      });
    }
  }
  const score = (s: Slot) => 0.4 * s.terms.availabilityPreference + 0.3 * s.terms.timezoneFairness + 0.15 * s.terms.leadTime + 0.15 * s.terms.panelLoadBalance;
  // Prefer spread across days: take the best per day first, then fill.
  const ranked = [...out].sort((a, b) => score(b) - score(a));
  const picked: Slot[] = [];
  const days = new Set<string>();
  for (const s of ranked) { const day = s.start.slice(0, 10); if (!days.has(day)) { picked.push(s); days.add(day); } if (picked.length >= (i.max ?? 4)) break; }
  for (const s of ranked) { if (picked.length >= (i.max ?? 4)) break; if (!picked.includes(s)) picked.push(s); }
  return picked.sort((a, b) => a.start.localeCompare(b.start));
}

const round = (n: number) => Math.round(n * 100) / 100;
export const slotScore = (s: Slot) => round(0.4 * s.terms.availabilityPreference + 0.3 * s.terms.timezoneFairness + 0.15 * s.terms.leadTime + 0.15 * s.terms.panelLoadBalance);
