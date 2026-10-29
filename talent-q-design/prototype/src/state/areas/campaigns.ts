// Hiring campaigns (audit addendum §D): organisation → campaign → requisitions (roles). A campaign groups roles for
// navigation and workload; it never copies role or candidate data. The role→campaign link lives only in `roles`.
// Outreach campaigns (agency, w.areas.agency) are a different thing: a child of a requisition or client pool.
// Read models (stage counts, next actions, the cross-role board) live in journeys/campaigns/model.ts and are always
// computed from w.pipeline, w.threads, w.interviews and the rubrics slice, never stored here.
import type { World } from '../../mock/world';
import type { HiringCampaign } from '../domain';

/** Per-requisition workload fields that have no home on the role itself yet (owner override, target date). */
export interface RoleMeta { owner?: string; due?: string }
export interface CampaignsState { list: HiringCampaign[]; roleMeta: Record<string, RoleMeta> }

export const area = {
  id: 'campaigns',
  init: (): CampaignsState => ({
    list: [
      { id: 'c_q4_eng', orgId: 'org_kora', name: 'Q4 Engineering Expansion', goal: 'Two backend hires for payments and payouts before the January freeze', owner: 'u_ada', deadline: '2026-12-19', status: 'ACTIVE', createdAt: '2026-10-01', createdBy: 'u_ada', roles: ['m_backend', 'm_payouts'],
        savedFilters: [{ id: 'sf_iv', label: 'At interview', query: 'stage:INTERVIEW' }, { id: 'sf_multi', label: 'In both roles', query: 'multi' }] },
      { id: 'c_merchant', orgId: 'org_kora', name: 'Merchant Success 2026', goal: 'Rebuild the merchant support team', owner: 'u_ngozi', deadline: '2027-01-31', status: 'ACTIVE', createdAt: '2026-09-12', createdBy: 'u_ngozi', roles: ['m_support'] },
      { id: 'c_tb_kora', orgId: 'org_tb', clientOrgId: 'org_kora', name: 'Kora Pay · Backend (agency)', goal: 'Confidential second backend hire for Kora, plus their payments platform role', owner: 'u_dele', deadline: '2026-12-12', status: 'ACTIVE', createdAt: '2026-10-10', createdBy: 'u_dele', roles: ['m_kora_agency', 'm_tb_kora_pay'] },
      { id: 'c_tb_med', orgId: 'org_tb', clientOrgId: 'org_medlink', name: 'Medlink Health · Claims and operations', goal: 'Remote backend and operations hires for Medlink’s claims team', owner: 'u_dele', deadline: '2027-01-15', status: 'ACTIVE', createdAt: '2026-10-18', createdBy: 'u_dele', roles: ['m_tb_med_api', 'm_ops'] },
    ],
    roleMeta: { m_backend: { owner: 'u_ada', due: '2026-12-05' }, m_payouts: { owner: 'u_ada', due: '2026-12-19' }, m_support: { owner: 'u_ngozi', due: '2026-11-30' } },
  }),
};
/** Typed accessor. Older saved worlds may lack newer keys, so missing ones fall back to the defaults. */
export const campaigns = (w: World) => { const s = (w.areas.campaigns ?? {}) as Partial<CampaignsState>; return { list: s.list ?? [], roleMeta: s.roleMeta ?? {} } as CampaignsState; };
/** For mutations inside update(): creates or completes the slice in place. */
export const campaignsMut = (w: World): CampaignsState => {
  const s = (w.areas.campaigns ??= area.init()) as CampaignsState;
  s.list ??= []; s.roleMeta ??= {};
  return s;
};
/** The campaign a role belongs to (one at most), scoped to the viewing organisation. */
export const campaignOf = (w: World, mandateId: string, orgId?: string) => campaigns(w).list.find((c) => c.roles.includes(mandateId) && (!orgId || c.orgId === orgId));
export const campaignsFor = (w: World, orgId: string, clientOrgId?: string) => campaigns(w).list.filter((c) => c.orgId === orgId && (clientOrgId === undefined || c.clientOrgId === clientOrgId));
