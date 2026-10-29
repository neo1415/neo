// Navigation icons: 20px, 1.75 stroke, round caps. Drawn for this product; decorative (labels always present).
const P = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
export const ICONS = {
  q: <svg {...P}><path d="M16.4 16.4A6.5 6.5 0 1 1 18.5 12" /><path d="M15.5 15.5 19 19" /><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" /></svg>,
  agents: <svg {...P}><circle cx="6" cy="6" r="2.2" /><circle cx="18" cy="6" r="2.2" /><circle cx="12" cy="18" r="2.2" /><path d="M8 7.2 10.8 16M16 7.2 13.2 16M8.2 6h7.6" /></svg>,
  roles: <svg {...P}><rect x="4" y="7" width="16" height="12" rx="2" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 12h16" /></svg>,
  search: <svg {...P}><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>,
  people: <svg {...P}><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2a4.5 4.5 0 0 1 5 4.8" /></svg>,
  approvals: <svg {...P}><path d="M4 12.5 9 17.5 20 6.5" /></svg>,
  calendar: <svg {...P}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>,
  memory: <svg {...P}><path d="M12 4a6 6 0 0 0-6 6c0 2 1 3.2 2 4.2V18h8v-3.8c1-1 2-2.2 2-4.2a6 6 0 0 0-6-6Z" /><path d="M10 21h4" /></svg>,
  org: <svg {...P}><path d="M4 20V8l8-4 8 4v12" /><path d="M9 20v-5h6v5M9 11h.01M15 11h.01" /></svg>,
  atlas: <svg {...P}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>,
  measures: <svg {...P}><path d="M5 19V11M12 19V5M19 19v-6" /></svg>,
  passport: <svg {...P}><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M9 16h6" /></svg>,
  practice: <svg {...P}><path d="M5 19 19 5M8 5h11v11" /></svg>,
  interview: <svg {...P}><path d="M5 5h14v10H9l-4 4z" /></svg>,
  welcome: <svg {...P}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2" /></svg>,
  more: <svg {...P}><circle cx="5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="19" cy="12" r="1.3" fill="currentColor" /></svg>,
  command: <svg {...P}><path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z" /></svg>,
  collapse: <svg {...P}><path d="M15 6l-6 6 6 6" /></svg>,
  expand: <svg {...P}><path d="M9 6l6 6-6 6" /></svg>,
  offline: <svg {...P}><path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4-2.3M19 12.5a10 10 0 0 0-3-2" /></svg>,
  reset: <svg {...P}><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /></svg>,
} as const;
export type IconName = keyof typeof ICONS;
