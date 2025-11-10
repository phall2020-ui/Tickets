import React from 'react'
import { listStatuses, createStatus, updateStatus, deleteStatus, type StatusOpt } from '../lib/directory'

interface StatusManagementProps {
  onClose: () => void
  onSuccess?: () => void
}

interface StatusWithId extends StatusOpt {
  id?: string
}

export default function StatusManagement({ onClose, onSuccess }: StatusManagementProps) {
  const [statuses, setStatuses] = React.useState<StatusWithId[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [showCreate, setShowCreate] = React.useState(false)
  const [formData, setFormData] = React.useState({ key: '', label: '' })

  React.useEffect(() => {
    loadStatuses()
  }, [])

  const loadStatuses = async () => {
    setLoading(true)
    try {
      const data = await listStatuses()
      setStatuses(data.map((s, idx) => ({ ...s, id: s.key })))
      setError(null)
    } catch (e: any) {
      setError(e?.message || 'Failed to load statuses')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.key || !formData.label) {
      setError('Key and label are required')
      return
    }

    try {
      await createStatus({ key: formData.key, label: formData.label })
      setFormData({ key: '', label: '' })
      setShowCreate(false)
      await loadStatuses()
      onSuccess?.()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create status')
    }
  }

  const handleUpdate = async (id: string, data: { label: string }) => {
    try {
      await updateStatus(id, data)
      setEditingId(null)
      await loadStatuses()
      onSuccess?.()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to update status')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this status?')) return

    try {
      await deleteStatus(id)
      await loadStatuses()
      onSuccess?.()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to delete status')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="panel" style={{ maxWidth: 700, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="h1">Status Management (Admin Only)</div>
          <button onClick={onClose}>✕</button>
        </div>

        {error && (
          <div style={{ color: '#ffb3b3', marginBottom: 12, padding: 8, background: '#2a1a1a', borderRadius: 4 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <button
            className="primary"
            onClick={() => setShowCreate(!showCreate)}
            style={{ marginBottom: 12 }}
          >
            {showCreate ? 'Cancel' : '+ Create New Status'}
          </button>

          {showCreate && (
            <form onSubmit={handleCreate} style={{ marginBottom: 16, padding: 12, background: '#0e141c', borderRadius: 8 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Key (unique identifier)</label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={e => setFormData({ ...formData, key: e.target.value })}
                  placeholder="e.g., OPEN, IN_PROGRESS, CLOSED"
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Label (display name)</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={e => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Open, In Progress, Closed"
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <button type="submit" className="primary">Create Status</button>
            </form>
          )}
        </div>

        {loading ? (
          <div className="muted">Loading statuses...</div>
        ) : statuses.length === 0 ? (
          <div className="muted">No statuses found.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {statuses.map(status => (
              <div
                key={status.key}
                style={{
                  padding: 12,
                  background: '#0e141c',
                  borderRadius: 8,
                  border: '1px solid #1c2532'
                }}
              >
                {editingId === status.key ? (
                  <div>
                    <input
                      type="text"
                      defaultValue={status.label}
                      onBlur={(e) => {
                        if (e.target.value !== status.label) {
                          handleUpdate(status.key, { label: e.target.value })
                        } else {
                          setEditingId(null)
                        }
                      }}
                      style={{ width: '100%', marginBottom: 8 }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{status.label}</div>
                      <div className="muted" style={{ fontSize: 12 }}>Key: {status.key}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setEditingId(status.key)}
                        style={{ fontSize: 11, padding: '4px 8px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(status.key)}
                        style={{ fontSize: 11, padding: '4px 8px', background: '#5a1a1a', borderColor: '#7a2a2a' }}
                      >
                        Deactivate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
