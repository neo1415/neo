// Inline stroke icons. Decorative by default (aria-hidden); icon-only buttons carry their own aria-label.
import type { SVGProps } from 'react';

const base = (d: React.ReactNode) => (p: SVGProps<SVGSVGElement>) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{d}</svg>
);

export const IMic = base(<><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>);
export const ISend = base(<path d="M5 12h13M13 6l6 6-6 6" />);
export const ICheck = base(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IX = base(<path d="M6 6l12 12M18 6L6 18" />);
export const IAlert = base(<><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></>);
export const IInfo = base(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.5" /></>);
export const IPause = base(<path d="M9 6v12M15 6v12" />);
export const IPlay = base(<path d="M8 5l11 7-11 7z" />);
export const IStop = base(<rect x="6" y="6" width="12" height="12" rx="1.5" />);
export const IRefresh = base(<><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></>);
export const ICal = base(<><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>);
export const ILock = base(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
export const IEye = base(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>);
export const IEyeOff = base(<><path d="M3 3l18 18" /><path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3 3.6M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18 12 18c1.5 0 2.9-.3 4.1-.9" /></>);
export const IDoc = base(<><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>);
export const IArrowLeft = base(<path d="M19 12H6M11 6l-6 6 6 6" />);
export const IArrowRight = base(<path d="M5 12h13M13 6l6 6-6 6" />);
export const IEdit = base(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M14 6l4 4" /></>);
export const ISun = base(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const IMoon = base(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />);
export const IWifiOff = base(<><path d="M3 3l18 18" /><path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4-2.4M19 13a10 10 0 0 0-2.6-1.9M2 9.5a15 15 0 0 1 4.3-2.7M22 9.5A15 15 0 0 0 11 5.1" /><circle cx="12" cy="20" r=".8" /></>);
export const IUndo = base(<><path d="M9 7L4 12l5 5" /><path d="M4 12h11a5 5 0 0 1 0 10h-2" /></>);
export const IMenu = base(<path d="M4 8h16M4 16h16" />);

/** Evidence-state marks: distinct shapes so state never depends on colour. */
export function EvidenceMark({ state }: { state: string }) {
  const s = { width: 12, height: 12, viewBox: '0 0 12 12', className: 'ev-mark', 'aria-hidden': true } as const;
  switch (state) {
    case 'VERIFIED_CAPABILITY': return <svg {...s}><circle cx="6" cy="6" r="5" fill="currentColor" /><path d="M3.5 6.2l1.7 1.6L8.6 4.4" stroke="var(--color-surface)" strokeWidth="1.4" fill="none" /></svg>;
    case 'EVIDENCED': return <svg {...s}><circle cx="6" cy="6" r="5" fill="currentColor" /></svg>;
    case 'EVIDENCE_OUTDATED': return <svg {...s}><circle cx="6" cy="6" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M6 3.5V6l1.6 1" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>;
    case 'BELOW_TARGET_ON_ASSESSMENT': return <svg {...s}><path d="M6 1.5L10.5 10H1.5z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
    case 'REQUIREMENT_UNCLEAR': return <svg {...s}><circle cx="6" cy="6" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 1.6" /></svg>;
    default: return <svg {...s}><circle cx="6" cy="6" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
  }
}
