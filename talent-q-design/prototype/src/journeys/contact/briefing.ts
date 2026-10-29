// Role briefings (AD-C-01): a short recorded briefing an employer attaches to a listing, with chapters and a transcript
// the employer provided. Q answers from this transcript only and quotes the time. Cached per listing version in
// production; here it is static seed data. The video itself is SIMULATED (no media file).
export interface Briefing {
  jobId: string; title: string; by: string; byTitle: string; recorded: string; duration: number; listingVersion: number;
  chapters: { t: number; label: string }[];
  transcript: { t: number; who: string; text: string }[];
  transcriptSource: string;
}

export const BRIEFINGS: Record<string, Briefing> = {
  j_kora_backend: {
    jobId: 'j_kora_backend', title: 'Senior Backend Engineer: the role in two minutes', by: 'Seyi Balogun', byTitle: 'Engineering manager, Kora Pay', recorded: '2026-10-22', duration: 120, listingVersion: 1,
    transcriptSource: 'Transcript written by Kora Pay and published with the listing',
    chapters: [
      { t: 0, label: 'Who we are' },
      { t: 24, label: 'The work' },
      { t: 58, label: 'On-call' },
      { t: 88, label: 'How we hire' },
      { t: 106, label: 'Pay and working pattern' },
    ],
    transcript: [
      { t: 0, who: 'Seyi', text: 'Hi, I’m Seyi Balogun. I lead the payments engineering team at Kora Pay, and this role would report to me.' },
      { t: 12, who: 'Seyi', text: 'We’re a team of seven backend engineers in Lagos, with one staff engineer, Musa, in London.' },
      { t: 24, who: 'Seyi', text: 'The work is the money path: settlement, reconciliation against the ledger, and paying merchants out every day.' },
      { t: 40, who: 'Seyi', text: 'We write Go, run Postgres, and we care a lot about payouts being safe to retry. Nobody should ever be paid twice.' },
      { t: 58, who: 'Seyi', text: 'Let’s be straight about incidents. When a settlement file is late, someone has to look at it, even at night.' },
      { t: 72, who: 'Seyi', text: 'So yes, the on-call is real: one week in six, with a secondary on the same team, and it’s paid as an allowance on top of salary.' },
      { t: 80, who: 'Seyi', text: 'Most on-call weeks have one or two pages; we review every page so the next week is quieter.' },
      { t: 88, who: 'Seyi', text: 'How we hire: a 45-minute conversation, then a walkthrough of something you’ve built, then a panel with me and Musa.' },
      { t: 100, who: 'Seyi', text: 'We don’t do take-home tests that eat your weekend.' },
      { t: 106, who: 'Seyi', text: 'The pay band is ₦2.4 to ₦3.1 million a month. We’re hybrid: three days a week in the Yaba office.' },
      { t: 114, who: 'Seyi', text: 'If you have a question, you can ask us before you apply. Thanks for listening.' },
    ],
  },
};
