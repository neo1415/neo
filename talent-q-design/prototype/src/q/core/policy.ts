// Fair-hiring guard. Q declines criteria that are not job-related and redirects to legitimate ones.
// Detection is deliberately conservative: it flags protected characteristics used as selection criteria,
// not mentions in other contexts (e.g. "accommodation for a disability" is allowed and supported).
export interface Protected { key: string; label: string; redirect: string }
const RULES: { re: RegExp; p: Protected }[] = [
  { re: /\b(men|women|male|female|man|woman|guys|girls|boys|ladies|gender|sex)\b/, p: { key: 'sex', label: 'sex or gender', redirect: 'the skills and availability the job needs' } },
  { re: /\b(under|over|below|above|younger than|older than)\s*\d{2}\b|\b(young|old|age|aged|youthful)\b/, p: { key: 'age', label: 'age', redirect: 'the experience level and stamina the job truly requires, described as tasks' } },
  { re: /\b(married|single|unmarried|marital|husband|wife|kids|children|pregnan\w*|maternity)\b/, p: { key: 'family', label: 'marital or family status', redirect: 'working hours and travel the job needs, stated the same for everyone' } },
  { re: /\b(christian|muslim|religion|religious|church|mosque)\b/, p: { key: 'religion', label: 'religion', redirect: 'the job’s actual schedule and duties' } },
  { re: /\b(igbo|yoruba|hausa|tribe|tribal|ethnic\w*|state of origin|indigene|race|white|black)\b/, p: { key: 'origin', label: 'ethnicity or origin', redirect: 'languages the role needs and the right to work in Nigeria' } },
  { re: /\b(pretty|handsome|good[- ]looking|attractive|tall|slim|fat|photo of)\b/, p: { key: 'appearance', label: 'appearance', redirect: 'how the person presents your business, judged by work examples and conversation' } },
];
const SELECTION = /\b(only|just|prefer|want|need|no|not|exclude|must be|should be|filter|hire|find|show)\b/;
export function protectedCriterion(norm: string): Protected | null {
  if (/\b(accommodation|adjustment|accessib)/.test(norm)) return null;
  if (!SELECTION.test(norm)) return null;
  for (const r of RULES) if (r.re.test(norm)) return r.p;
  return null;
}
