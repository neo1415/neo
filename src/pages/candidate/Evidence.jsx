import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Award, BadgeCheck, Code2, FileText, Github, Plus, ShieldCheck, UserCheck, XCircle } from 'lucide-react'
import { Avatar, Badge, Button, Toggle, spring, stagger, useToast } from '../../ui'

const items = [
  { id: 'task', icon: Code2, t: 'Practical task: Debug a slow payments API', d: 'Score 84 · reviewed by a qualified engineer', v: 'Verified', by: 'Talent Q assessment · Tolu Bello (reviewer)', when: '23 Oct 2026' },
  { id: 'ref', icon: UserCheck, t: 'Reference: incident leadership', d: 'From former engineering manager', v: 'Verified', by: 'Reference check · Kemi A.', when: '19 Oct 2026' },
  { id: 'gh', icon: Github, t: 'ledger-partition-tools (GitHub)', d: 'Public repo you selected · 240★', v: 'Linked', by: 'GitHub OAuth · read-only', when: '18 Oct 2026' },
  { id: 'cert', icon: Award, t: 'AWS Solutions Architect – Associate', d: 'Credential ID ending 7Q2', v: 'Pending', by: 'Issuer verification requested', when: '—' },
  { id: 'cv', icon: FileText, t: 'CV claims (6 approved)', d: 'Self-reported', v: 'Self-reported', by: 'Your CV upload', when: '17 Oct 2026' },
]

export default function Evidence() {
  const toast = useToast()
  const [share, setShare] = useState({ task: true, ref: true, gh: true, cert: false, cv: true })
  const [revoked, setRevoked] = useState(false)
  return (
    <div>
      <div className="page-head">
        <div><div className="small muted">Prove it once, reuse it with consent</div><h1>Evidence wallet</h1></div>
        <Button variant="primary" icon={Plus}>Add evidence</Button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="card">
          {items.map((it, i) => (
            <motion.div key={it.id} {...stagger(i)} className="row" style={{ padding: '16px 20px', gap: 14, borderBottom: i < items.length - 1 ? '1px solid var(--line)' : 0 }}>
              <span className={`ic-box ${it.v === 'Verified' ? 'green' : it.v === 'Pending' ? 'amber' : ''}`}><it.icon size={18} /></span>
              <div className="grow">
                <div className="row" style={{ fontWeight: 650 }}>{it.t}</div>
                <div className="muted small">{it.d}</div>
                <div className="tiny faint" style={{ marginTop: 4 }}>Source: {it.by} · {it.when}</div>
              </div>
              <Badge tone={it.v === 'Verified' ? 'green' : it.v === 'Pending' ? 'amber' : it.v === 'Linked' ? 'blue' : ''} icon={it.v === 'Verified' ? BadgeCheck : undefined}>{it.v}</Badge>
              <div className="col" style={{ alignItems: 'center', gap: 2 }}><Toggle on={share[it.id]} onChange={(v) => setShare({ ...share, [it.id]: v })} label="Share" /><span className="tiny faint">Shareable</span></div>
            </motion.div>
          ))}
        </div>
        <div className="col" style={{ gap: 14 }}>
          <div className="card pad">
            <div className="card-title">Who can see your evidence</div>
            <AnimatePresence>
              {!revoked && (
                <motion.div exit={{ opacity: 0, height: 0, x: 20 }} transition={spring} className="row" style={{ marginTop: 14, gap: 12 }}>
                  <Avatar name="Paystride" size={36} hue={1} />
                  <div className="grow"><div style={{ fontWeight: 600 }}>Paystride</div><div className="muted tiny">3 items · granted 26 Oct · expires when process ends</div></div>
                  <Button size="sm" variant="danger" icon={XCircle} onClick={() => { setRevoked(true); toast('Access revoked', { sub: 'Paystride can no longer view your evidence', action: { label: 'Undo', onClick: () => setRevoked(false) } }) }}>Revoke</Button>
                </motion.div>
              )}
            </AnimatePresence>
            {revoked && <p className="muted small" style={{ marginTop: 14 }}>No employers currently have access.</p>}
          </div>
          <div className="card pad row" style={{ gap: 12, alignItems: 'flex-start', background: 'var(--green-soft)', borderColor: '#cbe7d6' }}>
            <ShieldCheck size={20} color="var(--green)" />
            <div className="small" style={{ lineHeight: 1.55 }}><b>Your task result saved you 2 repeat tests.</b> Kora Health and Northwind accepted it instead of their own screening task.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
