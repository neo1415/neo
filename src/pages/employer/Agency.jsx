import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertOctagon, Building2, Check, FileCheck2, Plus, Send, ShieldCheck, Users } from 'lucide-react'
import { Avatar, Badge, Button, Modal, Segmented, spring, stagger, useToast } from '../../ui'

const clients = [
  { n: 'Paystride', m: 2, p: 1, fee: '$4,800', hue: 1 },
  { n: 'Kora Health', m: 3, p: 0, fee: '$0', hue: 2 },
  { n: 'Northwind Logistics', m: 1, p: 2, fee: '$9,600', hue: 3 },
  { n: 'Ledgerline', m: 2, p: 1, fee: '$5,200', hue: 4 },
]
const ledger = [
  ['Daniel Mwangi', 'Kora Health', 'Platform Engineer', 'Represented', '12 Oct', 'Signed consent'],
  ['Kwame Mensah', 'Paystride', 'Backend Engineer', 'Submitted', '20 Oct', 'Signed consent'],
  ['Halima Sule', 'Northwind', 'Support Lead', 'Placed', '2 Sep', 'Fee invoiced'],
  ['Ngozi Obi', 'Ledgerline', 'Database Engineer', 'Represented', '18 Oct', 'Signed consent'],
]

export default function Agency() {
  const toast = useToast()
  const [view, setView] = useState('ledger')
  const [warn, setWarn] = useState(false)
  return (
    <div>
      <div className="page-head">
        <div><div className="small muted">Bakare Talent Partners</div><h1>Agency console</h1></div>
        <div className="row"><Segmented id="ag" options={[{ value: 'ledger', label: 'Representation ledger' }, { value: 'clients', label: 'Clients' }]} value={view} onChange={setView} /><Button variant="primary" icon={Send} onClick={() => setWarn(true)} data-q="submit-candidate">Submit candidate</Button></div>
      </div>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        {clients.map((c, i) => (
          <motion.div key={c.n} {...stagger(i)} className="card pad hover">
            <div className="row" style={{ gap: 10 }}><Avatar name={c.n} size={34} hue={c.hue} /><div className="grow"><div style={{ fontWeight: 650 }}>{c.n}</div><div className="muted tiny">{c.m} active mandates</div></div></div>
            <div className="row between small" style={{ marginTop: 14 }}><span className="muted">Placements</span><b>{c.p}</b></div>
            <div className="row between small" style={{ marginTop: 4 }}><span className="muted">Fees YTD</span><b>{c.fee}</b></div>
          </motion.div>
        ))}
      </div>
      <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
        {view === 'ledger' ? (
          <table className="table">
            <thead><tr><th>Candidate</th><th>Client</th><th>Role</th><th>Status</th><th>Since</th><th>Authority</th></tr></thead>
            <tbody>
              {ledger.map((r, i) => (
                <motion.tr key={r[0]} {...stagger(i, 0.05)}>
                  <td><span className="row"><Avatar name={r[0]} size={26} />{r[0]}</span></td><td>{r[1]}</td><td>{r[2]}</td>
                  <td><Badge tone={r[3] === 'Placed' ? 'green' : r[3] === 'Submitted' ? 'blue' : 'violet'}>{r[3]}</Badge></td><td className="muted">{r[4]}</td>
                  <td><span className="row small"><FileCheck2 size={14} color="var(--green)" />{r[5]}</span></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 20 }} className="grid g2">
            {clients.map((c) => <div key={c.n} className="card pad row" style={{ gap: 12 }}><Building2 size={18} /><div className="grow"><b>{c.n}</b><div className="muted small">Isolated workspace · separate billing</div></div><Badge tone="green" icon={ShieldCheck}>Tenant isolated</Badge></div>)}
          </div>
        )}
      </motion.div>

      <Modal open={warn} onClose={() => setWarn(false)} width={500}>
        <div style={{ padding: 24 }}>
          <motion.div initial={{ rotate: -12, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={spring} className="ic-box red" style={{ width: 48, height: 48 }}><AlertOctagon size={22} /></motion.div>
          <h2 style={{ fontSize: 22, marginTop: 14 }}>Possible duplicate submission</h2>
          <p className="muted" style={{ marginTop: 8 }}><b style={{ color: 'var(--text)' }}>Daniel Mwangi</b> is already represented to <b style={{ color: 'var(--text)' }}>Kora Health</b> (since 12 Oct). Submitting him to Paystride may conflict with your representation terms.</p>
          <div className="card pad small" style={{ marginTop: 14, background: 'var(--paper)' }}>
            <div className="row"><Users size={14} /> Q recommends: ask Daniel to confirm he wants both submissions, and log consent.</div>
          </div>
          <div className="row" style={{ marginTop: 20, gap: 10 }}><span className="grow" /><Button onClick={() => setWarn(false)}>Cancel</Button><Button variant="primary" onClick={() => { setWarn(false); toast('Consent request sent to Daniel', { sub: 'Submission held until he confirms', tone: 'gold' }) }} data-q="ask-consent">Ask Daniel first</Button></div>
        </div>
      </Modal>
    </div>
  )
}
