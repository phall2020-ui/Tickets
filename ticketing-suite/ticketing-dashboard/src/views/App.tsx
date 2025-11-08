import { Outlet, useNavigate } from 'react-router-dom'
import React from 'react'
export default function App() {
  const navigate = useNavigate()
  const [token, setToken] = React.useState(localStorage.getItem('token') || '')
  const [user, setUser] = React.useState(localStorage.getItem('userId') || '')
  const save = () => { localStorage.setItem('token', token); localStorage.setItem('userId', user); navigate(0) }
  return (
    <div className="container">
      <div className="panel row" style={{alignItems:'center', justifyContent:'space-between'}}>
        <div className="row">
          <div className="h1">🎛️ Ticketing Dashboard</div>
          <div className="chip">API: {import.meta.env.VITE_API_BASE || 'http://localhost:3000'}</div>
        </div>
        <div className="row">
          <input style={{minWidth:260}} placeholder="Bearer token" value={token} onChange={e=>setToken(e.target.value)} />
          <input style={{minWidth:180}} placeholder="Your User ID (for assignment boosts)" value={user} onChange={e=>setUser(e.target.value)} />
          <button className="primary" onClick={save}>Save</button>
        </div>
      </div>
      <Outlet />
      <div style={{height:16}} />
      <div className="muted">Tip: paste a JWT for staging/prod. Locally, your API may accept a dev token.</div>
    </div>
  )
}
