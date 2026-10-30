// Public site (SC-005, SC-008): what a visitor or a returning person did on the public pages.
// Interest in a pricing offer is recorded here and NOTHING is sent: no payment, no email, no sales contact.
// Sign-ins are recorded so the shared event log can show "signed in with Microsoft (simulated)".
import type { World } from '../../mock/world';

export type OfferId = 'pilot' | 'team' | 'agency' | 'candidate';
export type AuthMethod = 'EMAIL_CODE' | 'GOOGLE' | 'MICROSOFT';
export interface PublicState {
  /** "Ask about this offer" requests: held in the prototype only, never sent. */
  interest: { id: string; offer: OfferId; name: string; email: string; org?: string; roles?: string; at: string }[];
  /** Simulated sign-ins, newest last. */
  signIns: { actor: string; method: AuthMethod; at: string }[];
}
export const area = { id: 'public', init: (): PublicState => ({ interest: [], signIns: [] }) };
export const pub = (w: World) => (w.areas.public ?? (w.areas.public = area.init())) as PublicState;

/** Organisations whose (simulated) policy says their team signs in with Microsoft only. */
export const SSO_ONLY: Record<string, { orgName: string; provider: 'MICROSOFT' }> = { 'talentbridge.example': { orgName: 'Talentbridge', provider: 'MICROSOFT' } };
export const domainOf = (email: string) => email.trim().toLowerCase().split('@')[1] ?? '';
