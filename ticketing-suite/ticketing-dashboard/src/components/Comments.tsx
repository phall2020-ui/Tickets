import React from 'react'
import { listComments, addComment, type Comment } from '../lib/api'

interface CommentsProps {
  ticketId: string
}

export default function Comments({ ticketId }: CommentsProps) {
  const [comments, setComments] = React.useState<Comment[]>([])
  const [loading, setLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [newComment, setNewComment] = React.useState('')
  const [visibility, setVisibility] = React.useState<'PUBLIC' | 'INTERNAL'>('INTERNAL')

  const loadComments = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listComments(ticketId)
      setComments(data)
    } catch (e: any) {
      setError(e?.message || 'Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadComments()
  }, [ticketId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      await addComment(ticketId, newComment.trim(), visibility)
      setNewComment('')
      setVisibility('INTERNAL')
      await loadComments()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Comments ({comments.length})</div>
      
      {error && (
        <div style={{ color: '#ffb3b3', marginBottom: 12, padding: 8, background: '#2a1a1a', borderRadius: 4 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="muted">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="muted">No comments yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          {comments.map(comment => (
            <div
              key={comment.id}
              style={{
                padding: 12,
                background: '#0e141c',
                borderRadius: 8,
                border: '1px solid #1c2532'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  {new Date(comment.createdAt).toLocaleString()}
                  {comment.userId && ` · User ${comment.userId}`}
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    background: comment.visibility === 'PUBLIC' ? '#14311d' : '#2a1a1a',
                    color: comment.visibility === 'PUBLIC' ? '#a6f0c2' : '#8ca0b3',
                    border: `1px solid ${comment.visibility === 'PUBLIC' ? '#1d4b2c' : '#3a2c0d'}`
                  }}
                >
                  {comment.visibility}
                </span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {comment.body}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 8 }}>
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            style={{ width: '100%', minHeight: 80, marginBottom: 8 }}
            disabled={submitting}
          />
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <label style={{ marginRight: 8, fontSize: 13 }}>Visibility:</label>
            <select
              value={visibility}
              onChange={e => setVisibility(e.target.value as 'PUBLIC' | 'INTERNAL')}
              style={{ width: 120 }}
            >
              <option value="INTERNAL">Internal</option>
              <option value="PUBLIC">Public</option>
            </select>
          </div>
          <button type="submit" className="primary" disabled={submitting || !newComment.trim()}>
            {submitting ? 'Adding...' : 'Add Comment'}
          </button>
        </div>
      </form>
    </div>
  )
}

