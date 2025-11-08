import { Outlet, useNavigate, Link } from 'react-router-dom'
import React from 'react'
import UserRegistration from '../components/UserRegistration'
import { useNotifications } from '../lib/notifications'

export default function App() {
  const navigate = useNavigate()
  const { showNotification } = useNotifications()
  const [token, setToken] = React.useState(localStorage.getItem('token') || '')
  const [user, setUser] = React.useState(localStorage.getItem('userId') || '')
  const [showUserReg, setShowUserReg] = React.useState(false)
  const [userRole, setUserRole] = React.useState<'ADMIN' | 'USER' | null>(null)
  
  const save = () => { 
    localStorage.setItem('token', token)
    localStorage.setItem('userId', user)
    showNotification('success', 'Settings saved')
    navigate(0) 
  }
  
  React.useEffect(() => {
    // Try to decode JWT to get user role
    const t = localStorage.getItem('token') || token
    if (t) {
      try {
        const payload = JSON.parse(atob(t.split('.')[1]))
        setUserRole(payload.role || null)
      } catch {}
    }
  }, [token])

  return (
    <div className="container">
      <div className="panel row" style={{alignItems:'center', justifyContent:'space-between', flexWrap: 'wrap', gap: 12}}>
        <div className="row" style={{flexWrap: 'wrap', gap: 8}}>
          <Link to="/" className="h1" style={{textDecoration: 'none', color: 'inherit'}}>🎛️ Ticketing Dashboard</Link>
          <div className="chip">API: {import.meta.env.VITE_API_BASE || 'http://localhost:3000'}</div>
          <Link to="/health" style={{padding: '6px 12px', background: '#0e141c', border: '1px solid #1c2532', borderRadius: 6, fontSize: 13, textDecoration: 'none', color: 'inherit'}}>
            💚 Health
          </Link>
          <Link to="/profile" style={{padding: '6px 12px', background: '#0e141c', border: '1px solid #1c2532', borderRadius: 6, fontSize: 13, textDecoration: 'none', color: 'inherit'}}>
            👤 Profile
          </Link>
          {userRole === 'ADMIN' && (
            <button onClick={() => setShowUserReg(true)} style={{marginLeft: 0}}>👥 Manage Users</button>
          )}
        </div>
        <div className="row" style={{flexWrap: 'wrap', gap: 8}}>
          <input style={{minWidth:200, flex: 1}} placeholder="Bearer token" value={token} onChange={e=>setToken(e.target.value)} aria-label="Bearer token" />
          <input style={{minWidth:150}} placeholder="Your User ID" value={user} onChange={e=>setUser(e.target.value)} aria-label="User ID" />
          <button className="primary" onClick={save}>Save</button>
        </div>
      </div>
      <Outlet />
      <div style={{height:16}} />
      <div className="muted">Tip: paste a JWT for staging/prod. Locally, your API may accept a dev token.</div>
      {showUserReg && (
        <UserRegistration
          onClose={() => setShowUserReg(false)}
          onSuccess={() => {
            // Refresh to update user list
            setShowUserReg(false)
          }}
        />
      )}
    </div>
  )
}
