import React from 'react'
import { useNavigate } from 'react-router-dom'
import { createTicket } from '../lib/api'
import { listSites, listUsers, listIssueTypes, listFieldDefinitions, type SiteOpt, type UserOpt, type IssueTypeOpt, type FieldDefOpt } from '../lib/directory'
import CustomFieldsForm from './CustomFieldsForm'

interface CreateTicketProps {
  onClose: () => void
  onSuccess?: () => void
}

export default function CreateTicket({ onClose, onSuccess }: CreateTicketProps) {
  const nav = useNavigate()
  const [sites, setSites] = React.useState<SiteOpt[]>([])
  const [users, setUsers] = React.useState<UserOpt[]>([])
  const [types, setTypes] = React.useState<IssueTypeOpt[]>([])
  const [fieldDefs, setFieldDefs] = React.useState<FieldDefOpt[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  const [formData, setFormData] = React.useState({
    siteId: '',
    type: '',
    description: '',
    details: '',
    status: 'NEW' as const,
    priority: 'P3' as const,
    assignedUserId: '',
    custom_fields: {} as Record<string, any>
  })

  React.useEffect(() => {
    Promise.all([
      listSites(),
      listUsers(),
      listIssueTypes(),
      listFieldDefinitions()
    ]).then(([s, u, t, f]) => {
      setSites(s)
      setUsers(u)
      setTypes(t)
      setFieldDefs(f)
      if (s.length > 0) setFormData(prev => ({ ...prev, siteId: s[0].id }))
      if (t.length > 0) setFormData(prev => ({ ...prev, type: t[0].key }))
    }).catch(e => {
      setError('Failed to load form data: ' + (e?.message || 'Unknown error'))
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.siteId || !formData.type || !formData.description) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const payload: any = {
        siteId: formData.siteId,
        type: formData.type,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
      }
      if (formData.details) payload.details = formData.details
      if (formData.assignedUserId) payload.assignedUserId = formData.assignedUserId
      if (Object.keys(formData.custom_fields).length > 0) {
        payload.custom_fields = formData.custom_fields
      }

      const ticket = await createTicket(payload)
      onSuccess?.()
      nav(`/tickets/${ticket.id}`)
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create ticket')
    } finally {
      setLoading(false)
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
      <div className="panel" style={{ maxWidth: 600, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="h1">Create New Ticket</div>
          <button onClick={onClose}>✕</button>
        </div>

        {error && (
          <div style={{ color: '#ffb3b3', marginBottom: 12, padding: 8, background: '#2a1a1a', borderRadius: 4 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row" style={{ marginTop: 12 }}>
            <label style={{ width: 150 }}>Site *</label>
            <select
              value={formData.siteId}
              onChange={e => setFormData({ ...formData, siteId: e.target.value })}
              style={{ flex: 1 }}
              required
            >
              <option value="">Select a site</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <label style={{ width: 150 }}>Issue Type *</label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
              style={{ flex: 1 }}
              required
            >
              <option value="">Select issue type</option>
              {types.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <label style={{ width: 150 }}>Description *</label>
            <input
              style={{ flex: 1 }}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              required
              placeholder="Brief description of the issue"
            />
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <label style={{ width: 150 }}>Details</label>
            <textarea
              style={{ flex: 1, height: 100 }}
              value={formData.details}
              onChange={e => setFormData({ ...formData, details: e.target.value })}
              placeholder="Additional details..."
            />
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <label style={{ width: 150 }}>Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as any })}
            >
              {['NEW', 'TRIAGE', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <label style={{ width: 100, marginLeft: 12 }}>Priority</label>
            <select
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
            >
              {['P1', 'P2', 'P3', 'P4'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <label style={{ width: 150 }}>Assigned User</label>
            <select
              value={formData.assignedUserId}
              onChange={e => setFormData({ ...formData, assignedUserId: e.target.value })}
              style={{ flex: 1 }}
            >
              <option value="">Unassigned</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>

          {fieldDefs.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Custom Fields</label>
              <CustomFieldsForm
                fieldDefs={fieldDefs}
                values={formData.custom_fields}
                onChange={(custom_fields) => setFormData({ ...formData, custom_fields })}
              />
            </div>
          )}

          <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

