import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../lib/notifications'
import { useI18n } from '../lib/i18n'

export default function UserProfile() {
  const nav = useNavigate()
  const { showNotification } = useNotifications()
  const { language, setLanguage, t } = useI18n()
  const [user, setUser] = React.useState<{ name?: string; email?: string; role?: string } | null>(null)
  const [preferences, setPreferences] = React.useState(() => {
    const saved = localStorage.getItem('userPreferences')
    return saved ? JSON.parse(saved) : {
      theme: 'dark',
      language: 'en',
      defaultFilters: {},
      notifications: true
    }
  })

  React.useEffect(() => {
    // Try to decode user info from JWT
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({
          email: payload.email || 'Unknown',
          name: payload.name || 'Unknown',
          role: payload.role || 'USER'
        })
      } catch {
        setUser({ email: 'Unknown', name: 'Unknown', role: 'USER' })
      }
    }
  }, [])

  const savePreferences = () => {
    localStorage.setItem('userPreferences', JSON.stringify(preferences))
    showNotification('success', 'Preferences saved')
  }

  return (
    <div className="container">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="h1">User Profile & Settings</div>
          <button onClick={() => nav(-1)}>← Back</button>
        </div>

        {/* User Info */}
        <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #1c2532' }}>
          <div className="h2" style={{ marginBottom: 12 }}>User Information</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="row">
              <span style={{ width: 150, color: '#999' }}>Name:</span>
              <span>{user?.name || 'Not available'}</span>
            </div>
            <div className="row">
              <span style={{ width: 150, color: '#999' }}>Email:</span>
              <span>{user?.email || 'Not available'}</span>
            </div>
            <div className="row">
              <span style={{ width: 150, color: '#999' }}>Role:</span>
              <span>{user?.role || 'USER'}</span>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div style={{ marginBottom: 24 }}>
          <div className="h2" style={{ marginBottom: 12 }}>Preferences</div>
          
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="row">
              <label style={{ width: 200 }}>Theme</label>
              <select
                value={preferences.theme}
                onChange={e => setPreferences({ ...preferences, theme: e.target.value })}
                style={{ flex: 1 }}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>

            <div className="row">
              <label style={{ width: 200 }}>Language</label>
              <select
                value={language}
                onChange={e => {
                  const lang = e.target.value as 'en' | 'es' | 'fr' | 'de'
                  setLanguage(lang)
                  setPreferences({ ...preferences, language: lang })
                }}
                style={{ flex: 1 }}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <div className="row">
              <label style={{ width: 200 }}>Notifications</label>
              <input
                type="checkbox"
                checked={preferences.notifications}
                onChange={e => setPreferences({ ...preferences, notifications: e.target.checked })}
                style={{ width: 20, height: 20 }}
              />
              <span style={{ marginLeft: 8 }}>Enable notifications</span>
            </div>
          </div>
        </div>

        {/* Default Filters */}
        <div style={{ marginBottom: 24 }}>
          <div className="h2" style={{ marginBottom: 12 }}>Default Dashboard Filters</div>
          <div className="muted" style={{ marginBottom: 12 }}>
            These filters will be applied by default when you open the dashboard
          </div>
          <div style={{ padding: 12, background: '#0e141c', borderRadius: 8, fontSize: 13 }}>
            <div className="muted">Default filters feature coming soon. Filters are currently saved per session.</div>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => nav(-1)}>Cancel</button>
          <button className="primary" onClick={savePreferences}>Save Preferences</button>
        </div>
      </div>
    </div>
  )
}

