import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTicket, updateTicket } from '../lib/api'
export default function TicketView() {
  const { id } = useParams()
  const nav = useNavigate()
  const [t, setT] = React.useState<any>(null)
  const [saving, setSaving] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const load = async () => { if (!id) return; const data = await getTicket(id); setT(data) }
  React.useEffect(()=>{ load() }, [id])
  const save = async () => {
    if (!id || !t) return
    setSaving(true); setErr(null)
    try {
      const payload: any = { description: t.description, details: t.details, status: t.status, priority: t.priority }
      if (t.assignedUserId !== undefined) payload.assignedUserId = t.assignedUserId
      await updateTicket(id, payload); await load()
    } catch (e:any) { setErr(e?.message || 'Failed to save') } finally { setSaving(false) }
  }
  if (!t) return <div className="container"><div className="panel">Loading…</div></div>
  return (
    <div className="container">
      <div className="panel">
        <div className="row" style={{justifyContent:'space-between'}}>
          <div className="h1">Ticket</div>
          <button onClick={()=>nav(-1)}>← Back</button>
        </div>
        {err && <div className="row" style={{color:'#ffb3b3'}}>{err}</div>}
        <div className="row" style={{marginTop:12}}>
          <label style={{width:150}}>Description</label>
          <input style={{flex:1}} value={t.description} onChange={e=>setT({...t, description:e.target.value})} />
        </div>
        <div className="row" style={{marginTop:12}}>
          <label style={{width:150}}>Details</label>
          <textarea style={{flex:1, height:100}} value={t.details||''} onChange={e=>setT({...t, details:e.target.value})} />
        </div>
        <div className="row" style={{marginTop:12}}>
          <label style={{width:150}}>Status</label>
          <select value={t.status} onChange={e=>setT({...t, status:e.target.value})}>
            {['NEW','TRIAGE','IN_PROGRESS','PENDING','RESOLVED','CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label style={{width:100}}>Priority</label>
          <select value={t.priority} onChange={e=>setT({...t, priority:e.target.value})}>
            {['P1','P2','P3','P4'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="row" style={{marginTop:12}}>
          <label style={{width:150}}>Assigned User ID</label>
          <input style={{flex:1}} placeholder="user-id" value={t.assignedUserId || ''} onChange={e=>setT({...t, assignedUserId:e.target.value})} />
        </div>
        <div className="row" style={{marginTop:16, justifyContent:'flex-end'}}>
          <button className="primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
