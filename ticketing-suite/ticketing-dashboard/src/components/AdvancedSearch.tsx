import React from 'react'
import { useNotifications } from '../lib/notifications'

interface AdvancedSearchProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (query: string, filters: Record<string, any>) => void
  initialQuery?: string
}

export default function AdvancedSearch({ isOpen, onClose, onSearch, initialQuery = '' }: AdvancedSearchProps) {
  const [query, setQuery] = React.useState(initialQuery)
  const [searchHistory, setSearchHistory] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('searchHistory')
    return saved ? JSON.parse(saved) : []
  })
  const { showNotification } = useNotifications()

  const handleSearch = () => {
    if (!query.trim()) {
      showNotification('warning', 'Please enter a search query')
      return
    }
    
    // Save to history
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10)
    setSearchHistory(newHistory)
    localStorage.setItem('searchHistory', JSON.stringify(newHistory))
    
    onSearch(query, {})
    onClose()
  }

  const useHistoryItem = (item: string) => {
    setQuery(item)
  }

  if (!isOpen) return null

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
          <div className="h1">Advanced Search</div>
          <button onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Search Query</label>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search tickets by description, details, type..."
            style={{ width: '100%', padding: 12, fontSize: 16 }}
            autoFocus
          />
        </div>

        {searchHistory.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Recent Searches</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {searchHistory.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => useHistoryItem(item)}
                  style={{
                    padding: '6px 12px',
                    background: '#0e141c',
                    border: '1px solid #1c2532',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16, padding: 12, background: '#0e141c', borderRadius: 8, fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Search Tips:</div>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#999' }}>
            <li>Search across ticket descriptions, details, and types</li>
            <li>Use multiple words to narrow results</li>
            <li>Combine with filters in the dashboard for precise results</li>
          </ul>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSearch}>Search</button>
        </div>
      </div>
    </div>
  )
}

