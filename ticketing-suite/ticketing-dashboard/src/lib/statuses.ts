import { listStatuses } from './directory'

// This will be dynamically loaded
let cachedStatuses: { value: string; label: string }[] = []

export const loadStatusOptions = async () => {
  try {
    const statuses = await listStatuses()
    cachedStatuses = statuses.map(s => ({ value: s.key, label: s.label }))
    return cachedStatuses
  } catch (e) {
    console.error('Failed to load statuses:', e)
    // Fallback to defaults if API fails
    cachedStatuses = [
      { value: 'AWAITING_RESPONSE', label: 'Awaiting Response' },
      { value: 'ADE_TO_RESPOND', label: 'ADE to Respond' },
      { value: 'ON_HOLD', label: 'On Hold' },
      { value: 'CLOSED', label: 'Closed' },
    ]
    return cachedStatuses
  }
}

export const getStatusOptions = () => cachedStatuses

export const STATUS_OPTIONS = cachedStatuses
export type TicketStatusValue = string

export const getStatusLabel = (key: string): string => {
  const status = cachedStatuses.find(s => s.value === key)
  return status?.label || key
}

export const STATUS_LABELS: Record<string, string> = new Proxy({} as Record<string, string>, {
  get: (_target, prop: string) => getStatusLabel(prop)
})

