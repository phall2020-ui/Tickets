import React from 'react'
import { listTickets } from '../lib/api'
import { sortTickets, loadCfg, saveCfg, type PriorityCfg } from '../lib/prioritise'
import { Link } from 'react-router-dom'
const StatusFilter: React.FC<{value:string,onChange:(v:string)=>void}> = ({value,onChange}) => (
  <select value={value} onChange={e=>onChange(e.target.value)}>
    <option value="">All statuses</option>
    {['NEW','TRIAGE','IN_PROGRESS','PENDING','RESOLVED','CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
  </select>
)
export default function Dashboard() {
  const [tickets, setTickets] = React.useState<any[]>([])
  const [status, setStatus] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const userId = localStorage.getItem('userId') || ''
  const [cfg, setCfg] = React.useState<PriorityCfg>(() => loadCfg(userId || 'default'))
  const fetchList = async () => {
    setLoading(true)
    try {
      const data = await listTickets({ status: status || undefined, search: search || undefined })
      const sorted = sortTickets(data, userId || undefined, cfg)
      setTickets(sorted)
    } finally { setLoading(false) }
  }
  React.useEffect(() => { fetchList() }, [status])
  React.useEffect(() => { const id = setTimeout(fetchList, 350); return () => clearTimeout(id) }, [search, cfg, userId])
  const saveConfig = () => { saveCfg(userId || 'default', cfg); fetchList() }
  return (
    <div className="grid">
      <div className="panel">
        <div className="row" style={{marginBottom:12}}>
          <input placeholder="Search description/details/type..." value={search} onChange={e=>setSearch(e.target.value)} />
          <StatusFilter value={status} onChange={setStatus} />
          <div className="spacer" />
          <button onClick={fetchList}>Refresh</button>
        </div>
        <table>
          <thead><tr><th>Priority</th><th>Description</th><th>Status</th><th>Type</th><th>Assigned</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7}>Loading…</td></tr>
            : tickets.length === 0 ? <tr><td colSpan={7}>No tickets found.</td></tr>
            : tickets.map(t => (
              <tr key={t.id}>
                <td><span className={`badge ${t.priority}`}>{t.priority}</span></td>
                <td><div className="linkish"><Link to={`/tickets/${t.id}`}>{t.description}</Link></div><div className="status">{t.details || ''}</div></td>
                <td>{t.status}</td>
                <td>{t.typeKey}</td>
                <td>{t.assignedUserId || <span className="muted">—</span>}</td>
                <td>{new Date(t.createdAt).toLocaleString()}</td>
                <td><Link to={`/tickets/${t.id}`}>Open →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel">
        <div className="h1" style={{marginBottom:8}}>My prioritisation</div>
        <div className="muted" style={{marginBottom:12}}>Configure how your dashboard orders tickets. This only affects your view.</div>
        <div className="row" style={{marginBottom:8}}>
          <label style={{width:140}}>Boost if assigned</label>
          <input type="number" value={cfg.boostAssignedToMe} onChange={e=>setCfg({...cfg, boostAssignedToMe:Number(e.target.value)})} />
        </div>
        <div style={{marginBottom:8}}>
          <div className="muted">Priority weights</div>
          {(['P1','P2','P3','P4'] as const).map(p => (
            <div key={p} className="row" style={{marginTop:6}}>
              <label style={{width:60}}>{p}</label>
              <input type="number" value={cfg.weightPriority[p]} onChange={e=>setCfg({...cfg, weightPriority: {...cfg.weightPriority, [p]: Number(e.target.value)}})} />
            </div>
          ))}
        </div>
        <div style={{marginBottom:8}}>
          <div className="muted">Status weights</div>
          {['NEW','TRIAGE','IN_PROGRESS','PENDING','RESOLVED','CLOSED'].map(s => (
            <div key={s} className="row" style={{marginTop:6}}>
              <label style={{width:120}}>{s}</label>
              <input type="number" value={(cfg.weightStatus as any)[s]||0} onChange={e=>setCfg({...cfg, weightStatus: {...cfg.weightStatus, [s]: Number(e.target.value)}})} />
            </div>
          ))}
        </div>
        <div style={{marginBottom:8}}>
          <div className="muted">Type boosts (comma-separated: TYPE=WEIGHT)</div>
          <input placeholder="FAULT=10, SECURITY=6" onBlur={e=>{
            const map: Record<string, number> = {}
            e.target.value.split(',').map(s=>s.trim()).filter(Boolean).forEach(pair => {
              const [k,v] = pair.split('=').map(x=>x.trim())
              if (k && v) map[k]=Number(v)
            })
            setCfg({...cfg, typeBoosts: map})
          }} />
        </div>
        <div className="row">
          <button className="primary" onClick={saveConfig}>Save</button>
        </div>
      </div>
    </div>
  )
}
