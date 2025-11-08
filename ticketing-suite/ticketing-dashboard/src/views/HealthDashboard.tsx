import React from 'react'
import { useNavigate } from 'react-router-dom'
import { getHealth, getHealthDb, getHealthRedis, type HealthStatus } from '../lib/api'
import { useNotifications } from '../lib/notifications'

export default function HealthDashboard() {
  const nav = useNavigate()
  const [health, setHealth] = React.useState<HealthStatus | null>(null)
  const [dbHealth, setDbHealth] = React.useState<HealthStatus | null>(null)
  const [redisHealth, setRedisHealth] = React.useState<HealthStatus | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null)
  const { showNotification } = useNotifications()

  const loadHealth = async () => {
    setLoading(true)
    try {
      const [h, db, redis] = await Promise.all([
        getHealth().catch(e => ({ status: 'error' as const, error: { system: { status: 'down', message: e.message } } })),
        getHealthDb().catch(e => ({ status: 'error' as const, error: { db: { status: 'down', message: e.message } } })),
        getHealthRedis().catch(e => ({ status: 'error' as const, error: { redis: { status: 'down', message: e.message } } }))
      ])
      setHealth(h)
      setDbHealth(db)
      setRedisHealth(redis)
      setLastUpdate(new Date())
    } catch (e) {
      showNotification('error', 'Failed to load health status')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadHealth()
    const interval = setInterval(loadHealth, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    if (status === 'ok' || status === 'up') return '#2ecc71'
    if (status === 'error' || status === 'down') return '#e74c3c'
    return '#f1c40f'
  }

  const getStatusIcon = (status: string) => {
    if (status === 'ok' || status === 'up') return '✓'
    if (status === 'error' || status === 'down') return '✗'
    return '⚠'
  }

  return (
    <div className="container">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="h1">System Health Dashboard</div>
          <div className="row" style={{ gap: 8 }}>
            {lastUpdate && (
              <div className="muted" style={{ fontSize: 12 }}>
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
            <button onClick={loadHealth} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button onClick={() => nav(-1)}>← Back</button>
          </div>
        </div>

        {loading && !health ? (
          <div className="muted">Loading health status...</div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Overall Health */}
            <div style={{ padding: 16, background: '#0e141c', borderRadius: 8, border: '1px solid #1c2532' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>Overall System</div>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: getStatusColor(health?.status || 'error'),
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 14
                }}>
                  {getStatusIcon(health?.status || 'error')} {health?.status?.toUpperCase() || 'UNKNOWN'}
                </div>
              </div>
              {health?.info && Object.entries(health.info).map(([key, value]) => (
                <div key={key} style={{ marginTop: 8, fontSize: 13 }}>
                  <strong>{key}:</strong> {value.status}
                </div>
              ))}
              {health?.error && Object.entries(health.error).map(([key, value]) => (
                <div key={key} style={{ marginTop: 8, fontSize: 13, color: '#ffb3b3' }}>
                  <strong>{key}:</strong> {value.status} - {value.message || 'Unknown error'}
                </div>
              ))}
            </div>

            {/* Database Health */}
            <div style={{ padding: 16, background: '#0e141c', borderRadius: 8, border: '1px solid #1c2532' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>Database</div>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: getStatusColor(dbHealth?.status || 'error'),
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 14
                }}>
                  {getStatusIcon(dbHealth?.status || 'error')} {dbHealth?.status?.toUpperCase() || 'UNKNOWN'}
                </div>
              </div>
              {dbHealth?.info && Object.entries(dbHealth.info).map(([key, value]) => (
                <div key={key} style={{ marginTop: 8, fontSize: 13 }}>
                  <strong>{key}:</strong> {JSON.stringify(value, null, 2)}
                </div>
              ))}
              {dbHealth?.error && Object.entries(dbHealth.error).map(([key, value]) => (
                <div key={key} style={{ marginTop: 8, fontSize: 13, color: '#ffb3b3' }}>
                  <strong>{key}:</strong> {value.message || 'Unknown error'}
                </div>
              ))}
            </div>

            {/* Redis Health */}
            <div style={{ padding: 16, background: '#0e141c', borderRadius: 8, border: '1px solid #1c2532' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>Redis</div>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: getStatusColor(redisHealth?.status || 'error'),
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 14
                }}>
                  {getStatusIcon(redisHealth?.status || 'error')} {redisHealth?.status?.toUpperCase() || 'UNKNOWN'}
                </div>
              </div>
              {redisHealth?.info && Object.entries(redisHealth.info).map(([key, value]) => (
                <div key={key} style={{ marginTop: 8, fontSize: 13 }}>
                  <strong>{key}:</strong> {JSON.stringify(value, null, 2)}
                </div>
              ))}
              {redisHealth?.error && Object.entries(redisHealth.error).map(([key, value]) => (
                <div key={key} style={{ marginTop: 8, fontSize: 13, color: '#ffb3b3' }}>
                  <strong>{key}:</strong> {value.message || 'Unknown error'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

