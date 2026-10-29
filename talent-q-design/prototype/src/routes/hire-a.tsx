// Routes for R1 (Funmi) and R5 (Bayo). Owned by this area (see journeys/BUILD-BRIEF.md).
import type { ReactNode } from 'react';
import { registerRoute } from './registry';
import { OrgOnly } from './guard';
import { registerHomeSection, registerRecruiterHome } from './entry';
import { actorOf } from '../mock/world';
import { registerRef } from '../q/refs';
import { MandateIntake } from '../screens/MandateIntake';
import { Sourcing } from '../screens/Sourcing';
import { Memory } from '../screens/Memory';
import { RoleDetail, RolesList } from '../journeys/hire-a/Roles';
import { Audit } from '../journeys/hire-a/Audit';
import { FounderHome, WaitingOnYou } from '../journeys/hire-a/Home';
import { BriefRef, ConflictRef, MemoryRef, VerifyRef } from '../journeys/hire-a/ui';
import { isFounder } from '../journeys/hire-a/model';
import '../styles/hire-a.css';

const legacy = (n: ReactNode) => <div className="ds-legacy" style={{ minHeight: '100vh' }}>{n}</div>;

registerRoute({ path: '/r/mandate', side: 'recruiter', label: 'the role brief', render: () => <OrgOnly orgId="org_kora" what="Kora Pay’s hiring">{legacy(<MandateIntake />)}</OrgOnly> });
registerRoute({ path: '/r/sourcing', side: 'recruiter', label: 'the search', render: () => <OrgOnly orgId="org_kora" what="Kora Pay’s hiring">{legacy(<Sourcing />)}</OrgOnly>, nav: { group: 'Hiring', label: 'Search', icon: 'search', order: 13, orgKind: 'EMPLOYER', orgIds: ['org_kora'] } });
registerRoute({ path: '/r/memory', side: 'recruiter', label: 'what Q remembers', render: () => legacy(<Memory viewer="recruiter" />), nav: { group: 'Organisation', label: 'What Q remembers', icon: 'memory', order: 33 } });
registerRoute({ path: '/r/roles', side: 'recruiter', label: 'your roles', render: () => <RolesList />, nav: { group: 'Hiring', label: 'Roles', icon: 'roles', tab: true, order: 11, orgKind: 'EMPLOYER' } });
registerRoute({ path: '/r/roles/:id', side: 'recruiter', label: 'the role brief', render: (p) => <RoleDetail id={p.id} /> });
registerRoute({ path: '/r/audit', side: 'recruiter', label: 'the audit log', render: () => <Audit />, nav: { group: 'Organisation', label: 'Audit log', icon: 'org', order: 34 } });

// Founders and small businesses Q set up in conversation get a home that shows where they are.
registerRecruiterHome((w) => isFounder(actorOf(w)), () => <FounderHome />);
registerHomeSection('recruiter', { id: 'hire-a.waiting', order: 5, when: (w) => { const a = actorOf(w); return a.orgId === 'org_kora' && a.role === 'HIRING_MANAGER'; }, render: () => <WaitingOnYou /> });

registerRef('hire-a.brief', BriefRef);
registerRef('hire-a.memory', MemoryRef);
registerRef('hire-a.conflict', ConflictRef);
registerRef('hire-a.verify', VerifyRef);
