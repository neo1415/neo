// Candidate profile and CV ingestion service (simulated). Typed boundary: the onboarding UI calls only
// `ingest.parse` and the profile store actions, so a real parser and profile API can replace this file.
// Principle: everything read from a CV or said in conversation is a CLAIM. Nothing here creates evidence;
// evidence comes only from the Evidence Passport (work samples, assessments, verified credentials).
import { useSyncExternalStore } from 'react';

export type Track = 'graduate' | 'switcher' | 'experienced';
export type Confidence = 'sure' | 'check';
export interface Claim { id: string; text: string; source: 'CV' | 'CONVERSATION' | 'YOU'; confidence: Confidence; flagged?: string }
export interface Experience { id: string; title: string; org: string; when: string; claims: Claim[] }
export interface SkillItem { id: string; label: string; state: 'claimed' | 'suggested' | 'evidenced'; note?: string }
export interface Profile {
  v: 1; track: Track | null; name: string; location: string; workMode: 'remote' | 'hybrid' | 'onsite' | ''; visibility: 'private' | 'employers-i-choose';
  method: 'cv' | 'talk' | 'form' | null; step: 0 | 1 | 2 | 3 | 4 | 5 | 6; experience: Experience[]; skills: SkillItem[]; answers: Record<string, string>; done: boolean;
}

export const PERSONAS: Record<Track, { name: string; file: string; location: string; headline: string; experience: Experience[]; skills: SkillItem[]; questions: { id: string; ask: string; options: string[] }[] }> = {
  graduate: {
    name: 'Amaka Eze', file: 'Amaka_Eze_CV.pdf', location: 'Enugu', headline: 'Economics graduate, aspiring product analyst',
    experience: [
      { id: 'x1', title: 'Data analysis intern', org: 'Enugu State Ministry of Trade', when: 'Jun–Sep 2025', claims: [
        { id: 'c1', text: 'Built a weekly market-prices dashboard in Google Sheets', source: 'CV', confidence: 'sure' },
        { id: 'c2', text: 'Improved reporting for the trade desk', source: 'CV', confidence: 'check', flagged: 'Vague: what changed, and by how much?' },
      ] },
      { id: 'x2', title: 'Treasurer', org: 'Economics Students’ Association', when: '2024–2025', claims: [
        { id: 'c3', text: 'Ran a ₦1.2m student budget and interviewed six societies about spending', source: 'CV', confidence: 'sure' },
      ] },
    ],
    skills: [
      { id: 's1', label: 'Spreadsheet modelling', state: 'evidenced', note: 'Certificate already in your Passport' },
      { id: 's2', label: 'Dashboard storytelling', state: 'claimed' },
      { id: 's3', label: 'Statistics fundamentals', state: 'claimed' },
      { id: 's4', label: 'Stakeholder conversations', state: 'suggested', note: 'Q noticed this in your treasurer role. Add it only if it’s true.' },
    ],
    questions: [
      { id: 'tools', ask: 'Your internship mentions dashboards. Which tools did you use?', options: ['Google Sheets only', 'Sheets and some SQL', 'Excel and Power BI'] },
      { id: 'goal', ask: 'What are you aiming for first?', options: ['A product analyst role', 'Any data role to start', 'Not sure yet'] },
    ],
  },
  switcher: {
    name: 'Chidi Nwosu', file: 'Chidi_Nwosu_CV.pdf', location: 'Port Harcourt', headline: 'Retail store lead moving into sales development',
    experience: [
      { id: 'x1', title: 'Store lead', org: 'Bole Supermarkets', when: '2021–now', claims: [
        { id: 'c1', text: 'Grew monthly sales 18% by reorganising the weekend team', source: 'CV', confidence: 'sure' },
        { id: 'c2', text: 'Handled customer escalations', source: 'CV', confidence: 'check', flagged: 'How many a week, and what kind?' },
      ] },
    ],
    skills: [
      { id: 's1', label: 'Customer conversations', state: 'claimed' },
      { id: 's2', label: 'Target tracking', state: 'claimed' },
      { id: 's3', label: 'Prospecting', state: 'suggested', note: 'Most SDR roles need it. Q suggests practising it before adding it.' },
    ],
    questions: [
      { id: 'why', ask: 'What draws you to sales development?', options: ['I like meeting targets', 'Better pay and growth', 'I want to work remotely'] },
      { id: 'goal', ask: 'When do you want to switch?', options: ['Within 2 months', 'This year', 'Just exploring'] },
    ],
  },
  experienced: {
    name: 'Tobi Adeyemi', file: 'Tobi_Adeyemi_CV.pdf', location: 'Lagos', headline: 'Backend engineer, reconciliation · 7 yrs',
    experience: [
      { id: 'x1', title: 'Senior backend engineer', org: 'Lumen (fictional)', when: '2022–now', claims: [
        { id: 'c1', text: 'Designed the reconciliation job for 4m daily card settlements', source: 'CV', confidence: 'sure' },
        { id: 'c2', text: 'Led incident response', source: 'CV', confidence: 'check', flagged: 'Which incidents, and what was your role?' },
      ] },
      { id: 'x2', title: 'Backend engineer', org: 'Paylane (fictional)', when: '2019–2022', claims: [
        { id: 'c3', text: 'Wrote Go services for payouts', source: 'CV', confidence: 'sure' },
      ] },
    ],
    skills: [
      { id: 's1', label: 'Payments reconciliation', state: 'evidenced', note: 'Verified repository snapshot in your Passport' },
      { id: 's2', label: 'Go', state: 'claimed' },
      { id: 's3', label: 'Postgres performance', state: 'evidenced', note: 'Assessed tuning exercise in your Passport' },
      { id: 's4', label: 'Incident leadership', state: 'suggested', note: 'You mentioned it; nothing shared yet.' },
    ],
    questions: [
      { id: 'next', ask: 'What’s your next step?', options: ['Staff engineer', 'Senior role at a bigger company', 'Engineering manager'] },
      { id: 'open', ask: 'Who can see that you’re open to offers?', options: ['Nobody yet', 'Employers I choose', 'Verified employers'] },
    ],
  },
};

const KEY = 'tq.profile.v1';
export const blankProfile = (): Profile => ({ v: 1, track: null, name: '', location: '', workMode: '', visibility: 'private', method: null, step: 0, experience: [], skills: [], answers: {}, done: false });
let state: Profile = (() => { try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); if (p?.v === 1) return p as Profile; } catch { /* ignore */ } return blankProfile(); })();
const subs = new Set<() => void>();
export const setProfile = (f: (p: Profile) => Profile) => { state = f(state); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } subs.forEach((l) => l()); };
export function useProfile<T>(sel: (p: Profile) => T): T { return useSyncExternalStore((l) => { subs.add(l); return () => subs.delete(l); }, () => sel(state)); }

// ---------------- Ingestion (simulated parser) ----------------
export type ParseEvent = { stage: 'read' | 'experience' | 'skills' | 'dates'; done: number; total: number };
export type ParseResult = { ok: true; experience: Experience[]; skills: SkillItem[] } | { ok: false; code: 'NO_TEXT' | 'TOO_LARGE'; message: string; recover: string[] };

export const ingest = {
  /** Reads a CV. `file` names a sample; 'scan' simulates an image-only PDF with no extractable text. */
  async parse(track: Track, file: 'pdf' | 'scan', onProgress: (e: ParseEvent) => void): Promise<ParseResult> {
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    for (let i = 1; i <= 2; i++) { await wait(380); onProgress({ stage: 'read', done: i, total: 2 }); }
    if (file === 'scan') {
      await wait(400);
      return { ok: false, code: 'NO_TEXT', message: 'This file is a photo of a page, so there’s no text I can read reliably.', recover: ['Upload a PDF or Word file', 'Tell Q about your experience instead', 'Fill in a short form'] };
    }
    const p = PERSONAS[track];
    for (let i = 1; i <= p.experience.length; i++) { await wait(420); onProgress({ stage: 'experience', done: i, total: p.experience.length }); }
    for (let i = 1; i <= p.skills.length; i++) { await wait(260); onProgress({ stage: 'skills', done: i, total: p.skills.length }); }
    await wait(300); onProgress({ stage: 'dates', done: 1, total: 1 });
    return { ok: true, experience: structuredClone(p.experience), skills: structuredClone(p.skills) };
  },
};
