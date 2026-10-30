// Signed-in Q can answer questions about Talent Q itself (its prices and its rules) and open the public page.
// Prices are always given as hypotheses being tested (04_SOURCE_LEDGER "Unproven claims"); nothing is charged.
import { registerSkill } from '../core/engine';
import { OFFERS } from '../../journeys/public/content';

const ABOUT_US = /\b(talent ?q|this (app|product|platform|service))\b/;
registerSkill({
  id: 'public.pricing', side: 'both',
  match: (c) => (/\b(pric\w*|cost|how much|subscription|plans?)\b/.test(c.norm) && ABOUT_US.test(c.norm) && !/\b(role|candidate|salary|offer)\b/.test(c.norm) ? 0.9 : 0),
  handle: (c) => {
    const list = c.actor.side === 'candidate' ? OFFERS.filter((o) => o.id === 'candidate') : OFFERS;
    return { msgs: [{ kind: 'reply', text: c.actor.side === 'candidate'
      ? 'For you, Talent Q is free: no fee to apply or to be found. Optional paid practice is only an idea, and it isn’t offered.'
      : `These are the prices being tested, as hypotheses, not proven prices: ${list.map((o) => `${o.name} ${o.price} (${o.unit})`).join('; ')}. Nothing is charged in this prototype.`,
      actions: [{ label: 'Open the pricing page', primary: true, act: { t: 'nav', to: '/site/pricing' } }] }] };
  },
});
registerSkill({
  id: 'public.trust', side: 'both',
  match: (c) => (/\b(what (do|does|can) (you|q) decide|do you score (faces|accents|emotion)|trust page)\b/.test(c.norm) ? 0.9 : 0),
  handle: () => ({ msgs: [{ kind: 'reply', text: 'I don’t decide who is hired or turned down, and I never reject anyone or send anything without a person’s yes. I don’t score faces, accents, emotion or personality.',
    actions: [{ label: 'Read how Q is kept honest', primary: true, act: { t: 'nav', to: '/site/trust' } }] }] }),
});
