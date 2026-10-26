import { useState } from 'react'
import { motion } from 'framer-motion'
import { Ban, Download, Edit3, Eye, EyeOff, History, ShieldCheck, Trash2 } from 'lucide-react'
import { Avatar, Badge, Button, Modal, Segmented, Toggle, stagger, useToast } from '../../ui'

const views = [['Paystride', 'Viewed evidence wallet', '26 Oct, 10:40', 'You granted access'], ['Kora Health', 'Saw anonymised match card', '25 Oct, 16:02', 'Confidential mode'], ['Talent Q reviewer', 'Checked credential issuer', '24 Oct, 09:15', 'Verification you requested']]

export default function Privacy() {
  const toast = useToast()
  const [vis, setVis] = useState('Confidential')
  const [del, setDel] = useState(false)
  const [t, setT] = useState({ match: true, train: false, partners: false })
  return (
    <div>
      <div className="page-head"><div><div className="small muted">Your data, your rules</div><h1>Privacy & data</h1></div><Badge tone="green" icon={ShieldCheck}>NDPA & GDPR rights honoured</Badge></div>
      <div className="grid g2">
        <div className="col" style={{ gap: 14 }}>
          <motion.div {...stagger(0)} className="card pad">
            <div className="card-title">Profile visibility</div>
            <div style={{ marginTop: 12 }}><Segmented id="vis" options={['Open', 'Confidential', 'Hidden']} value={vis} onChange={(v) => { setVis(v); toast(`Visibility: ${v}`, { sub: 'Takes effect immediately' }) }} /></div>
            <div className="row small" style={{ marginTop: 14, gap: 8 }}><Ban size={14} color="var(--red)" /> Blocked: <b>Kudi Ledger</b> (current employer)</div>
          </motion.div>
          <motion.div {...stagger(1)} className="card">
            {[['match', 'Use my data to find matches', 'Required for Talent Q to work'], ['train', 'Help improve Q-Match with anonymised outcomes', 'Off by default'], ['partners', 'Let licensed partners include me', 'Off by default']].map(([k, l, d]) => (
              <div key={k} className="row" style={{ padding: '14px 18px', gap: 12, borderBottom: '1px solid var(--line)' }}><div className="grow"><div style={{ fontWeight: 600 }}>{l}</div><div className="muted small">{d}</div></div><Toggle on={t[k]} onChange={(v) => setT({ ...t, [k]: v })} label={l} /></div>
            ))}
          </motion.div>
          <motion.div {...stagger(2)} className="card pad row wrap" style={{ gap: 8 }}>
            <Button icon={Download} onClick={() => toast('Export ready', { sub: 'JSON + PDF · includes sources and consent history' })}>Download my data</Button>
            <Button icon={Edit3}>Request a correction</Button>
            <Button variant="danger" icon={Trash2} onClick={() => setDel(true)}>Delete account</Button>
          </motion.div>
        </div>
        <motion.div {...stagger(1)} className="card">
          <div className="row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', gap: 8 }}><History size={16} /><div className="card-title">Who accessed your data</div></div>
          {views.map(([n, a, w, why], i) => (
            <motion.div key={n} {...stagger(i + 2)} className="row" style={{ padding: '14px 20px', gap: 12, borderBottom: i < views.length - 1 ? '1px solid var(--line)' : 0 }}>
              <Avatar name={n} size={34} hue={i + 1} />
              <div className="grow"><div style={{ fontWeight: 600 }}>{n}</div><div className="small">{a}</div><div className="tiny faint">{w} · {why}</div></div>
              {i === 1 ? <EyeOff size={16} color="var(--muted)" /> : <Eye size={16} color="var(--muted)" />}
            </motion.div>
          ))}
        </motion.div>
      </div>
      <Modal open={del} onClose={() => setDel(false)} width={440}>
        <div style={{ padding: 24 }}>
          <div className="card-title" style={{ fontSize: 18 }}>Delete your Talent Q account?</div>
          <p className="muted small" style={{ marginTop: 8 }}>Your profile, evidence and transcripts are erased within 30 days. Employers keep only the minimum records required by law (e.g. that you applied), never your evidence.</p>
          <div className="row" style={{ marginTop: 20, gap: 8 }}><span className="grow" /><Button onClick={() => setDel(false)}>Keep my account</Button><Button variant="danger" onClick={() => setDel(false)}>Delete</Button></div>
        </div>
      </Modal>
    </div>
  )
}
