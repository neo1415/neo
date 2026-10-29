// Plain-language explanations of Talent Q terms. Q uses these when someone asks "what does X mean",
// and the UI can show them inline (Glossary component). Wording follows the UX-writing guidance:
// short, concrete, no jargon inside the explanation.
export const GLOSSARY: Record<string, { term: string; plain: string; example?: string; aliases: string[] }> = {
  mandate: { term: 'Role brief (mandate)', plain: 'A short description of the job you’re hiring for: what the person will do, what they must be able to show, where they work and what you can pay. Q uses it to search and compare fairly.', example: '“Bookkeeper, part-time, Ikeja, ₦150k a month, must keep accurate daily sales records.”', aliases: ['mandate', 'role brief', 'brief'] },
  payband: { term: 'Pay band', plain: 'The lowest and highest you’re willing to pay for the role. A range lets good people say yes without a long negotiation.', aliases: ['pay band', 'payband', 'salary band', 'band'] },
  evidence: { term: 'Evidence', plain: 'Proof of what someone can do: a work sample, a project, a reviewed assessment or a checked certificate. A CV line on its own is a claim, not evidence.', aliases: ['evidence', 'proof'] },
  claim: { term: 'Claim', plain: 'Something a person says about themselves, like a line in a CV. Claims are useful starting points; they aren’t proof until something backs them up.', aliases: ['claim', 'claims'] },
  shortlist: { term: 'Shortlist', plain: 'The few people you want to look at closely, usually three to six.', aliases: ['shortlist', 'short list'] },
  pipeline: { term: 'Pipeline', plain: 'Everyone you’re considering for a role and where each person is: found, contacted, interviewing, offer.', aliases: ['pipeline', 'funnel'] },
  verified: { term: 'Verified', plain: 'Checked at the source, for example the certificate’s issuer or the original repository. “Not verified” isn’t bad; it means not checked yet.', aliases: ['verified', 'verification', 'verify'] },
  practice: { term: 'Practice', plain: 'Private exercises in Talent Q. They help you improve but never count as proof and are never shown to employers.', aliases: ['practice', 'practise', 'quiz'] },
  panel: { term: 'Interview panel', plain: 'The people from your team who interview a candidate together. Kora’s handbook asks for two.', aliases: ['panel', 'interview panel'] },
  delegation: { term: 'Approval setting', plain: 'Whether Q may send messages for you. “Approve each send” means Q drafts and you say yes to every message.', aliases: ['delegation', 'approve each send', 'approval setting'] },
  consent: { term: 'Consent', plain: 'Your permission for an employer to see or use something about you. You can take it back at any time.', aliases: ['consent', 'permission'] },
  passport: { term: 'Evidence Passport', plain: 'Your private collection of proof about your work. You decide, item by item, which employer can see what.', aliases: ['passport', 'evidence passport'] },
  atlas: { term: 'Career atlas', plain: 'A map of jobs you could move into. The closer a job is to you, the fewer skills you still need to show.', aliases: ['atlas', 'career atlas', 'map'] },
  gap: { term: 'Gap', plain: 'A skill a job needs that you haven’t shown yet. It doesn’t mean you can’t do it; it means there’s no proof yet.', aliases: ['gap', 'gaps', 'skills gap'] },
  rubric: { term: 'Rubric', plain: 'The checklist a reviewer uses to judge a piece of work, so everyone is judged the same way.', aliases: ['rubric'] },
  sourcing: { term: 'Sourcing', plain: 'Searching for people who might fit a role, before contacting anyone.', aliases: ['sourcing', 'source'] },
};
export function findTerm(norm: string) {
  for (const [k, g] of Object.entries(GLOSSARY)) if (g.aliases.some((a) => norm.includes(a))) return { key: k, ...g };
  return null;
}
