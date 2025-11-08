import React from 'react'
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Stack,
  Chip,
  Typography,
  Card,
  CardContent,
  Grid,
  TableSortLabel,
  Tooltip,
  Dialog,
} from '@mui/material'
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'
import { useTickets, useUpdateTicket } from '../lib/hooks'
import { sortTickets, loadCfg, saveCfg, type PriorityCfg } from '../lib/prioritise'
import CreateTicket from '../components/CreateTicket'
import AdvancedSearch from '../components/AdvancedSearch'
import { listSites, listUsers, listIssueTypes, type SiteOpt, type UserOpt, type IssueTypeOpt } from '../lib/directory'
import { useNotifications } from '../lib/notifications'
import { exportToCSV, exportToJSON } from '../lib/export'
import { UserAvatar, EmptyState, Skeleton } from '../components/ui'
import type { Ticket } from '../lib/api'

const TicketRow: React.FC<{
  ticket: Ticket
  users: UserOpt[]
}> = ({ ticket, users }) => {
  const { showNotification } = useNotifications()
  const updateTicket = useUpdateTicket()
  const assignedUser = users.find(u => u.id === ticket.assignedUserId)
  
  const quickUpdate = async (field: string, value: any) => {
    try {
      await updateTicket.mutateAsync({ id: ticket.id, patch: { [field]: value } })
      showNotification('success', 'Ticket updated')
    } catch (e: any) {
      showNotification('error', e?.message || 'Failed to update ticket')
    }
  }

  const isOverdue = ticket.dueAt && new Date(ticket.dueAt) < new Date()
  const isDueSoon = ticket.dueAt && !isOverdue && (new Date(ticket.dueAt).getTime() - Date.now()) < 24 * 60 * 60 * 1000
  
  return (
    <TableRow hover>
      <TableCell>
        <Select
          value={ticket.priority}
          onChange={(e) => quickUpdate('priority', e.target.value)}
          size="small"
          disabled={updateTicket.isPending}
          aria-label={`Priority for ticket ${ticket.id}`}
        >
          {(['P1','P2','P3','P4'] as const).map(p => (
            <MenuItem key={p} value={p}>{p}</MenuItem>
          ))}
        </Select>
      </TableCell>
      <TableCell>
        <Link to={`/tickets/${ticket.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', mb: 0.5 }}>
            {ticket.description}
          </Typography>
        </Link>
        {ticket.details && (
          <Typography variant="caption" color="text.secondary">
            {ticket.details}
          </Typography>
        )}
        {ticket.dueAt && (
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={`Due: ${new Date(ticket.dueAt).toLocaleDateString()}`}
              size="small"
              color={isOverdue ? 'error' : isDueSoon ? 'warning' : 'success'}
              sx={{ fontSize: '0.65rem' }}
            />
          </Box>
        )}
      </TableCell>
      <TableCell>
        <Select
          value={ticket.status}
          onChange={(e) => quickUpdate('status', e.target.value)}
          size="small"
          disabled={updateTicket.isPending}
          aria-label={`Status for ticket ${ticket.id}`}
        >
          {['NEW','TRIAGE','IN_PROGRESS','PENDING','RESOLVED','CLOSED'].map(s => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Select>
      </TableCell>
      <TableCell>
        <Chip label={ticket.typeKey} size="small" variant="outlined" />
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          <UserAvatar name={assignedUser?.name} email={assignedUser?.email} size={24} />
          <Select
            value={ticket.assignedUserId || ''}
            onChange={(e) => quickUpdate('assignedUserId', e.target.value || null)}
            size="small"
            disabled={updateTicket.isPending}
            aria-label={`Assigned user for ticket ${ticket.id}`}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">Unassigned</MenuItem>
            {users.map(u => (
              <MenuItem key={u.id} value={u.id}>{u.name || u.email}</MenuItem>
            ))}
          </Select>
        </Stack>
      </TableCell>
      <TableCell>
        <Typography variant="caption">
          {new Date(ticket.createdAt).toLocaleString()}
        </Typography>
      </TableCell>
      <TableCell>
        <Button
          component={Link}
          to={`/tickets/${ticket.id}`}
          size="small"
          aria-label={`Open ticket ${ticket.id}`}
        >
          Open
        </Button>
      </TableCell>
    </TableRow>
  )
}

export default function Dashboard() {
  const { showNotification } = useNotifications()
  const [status, setStatus] = React.useState('')
  const [priority, setPriority] = React.useState('')
  const [type, setType] = React.useState('')
  const [siteId, setSiteId] = React.useState('')
  const [assignedUserId, setAssignedUserId] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [showCreate, setShowCreate] = React.useState(false)
  const [showFilters, setShowFilters] = React.useState(false)
  const [showAdvancedSearch, setShowAdvancedSearch] = React.useState(false)
  const [pageSize, setPageSize] = React.useState(50)
  const [sites, setSites] = React.useState<SiteOpt[]>([])
  const [users, setUsers] = React.useState<UserOpt[]>([])
  const [types, setTypes] = React.useState<IssueTypeOpt[]>([])
  const [sortColumn, setSortColumn] = React.useState<string>('')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc')
  const userId = localStorage.getItem('userId') || ''
  const [cfg, setCfg] = React.useState<PriorityCfg>(() => loadCfg(userId || 'default'))
  
  const params = React.useMemo(() => ({
    status: status || undefined,
    priority: priority || undefined,
    type: type || undefined,
    siteId: siteId || undefined,
    assignedUserId: assignedUserId || undefined,
    search: search || undefined,
    limit: pageSize,
  }), [status, priority, type, siteId, assignedUserId, search, pageSize])

  const { data: tickets = [], isLoading, refetch } = useTickets(params)
  
  // Load dropdown data
  React.useEffect(() => {
    Promise.all([listSites(), listUsers(), listIssueTypes()]).then(([s, u, t]) => {
      setSites(s); setUsers(u); setTypes(t)
    }).catch(e => console.error('Failed to load filters', e))
  }, [])

  // Load filters from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('dashboardFilters')
    if (saved) {
      try {
        const filters = JSON.parse(saved)
        setStatus(filters.status || '')
        setPriority(filters.priority || '')
        setType(filters.type || '')
        setSiteId(filters.siteId || '')
        setAssignedUserId(filters.assignedUserId || '')
        setSearch(filters.search || '')
        setDateFrom(filters.dateFrom || '')
        setDateTo(filters.dateTo || '')
        setPageSize(filters.pageSize || 50)
      } catch {}
    }
  }, [])

  // Save filters to localStorage
  React.useEffect(() => {
    localStorage.setItem('dashboardFilters', JSON.stringify({
      status, priority, type, siteId, assignedUserId, search, pageSize, dateFrom, dateTo
    }))
  }, [status, priority, type, siteId, assignedUserId, search, pageSize, dateFrom, dateTo])

  const handleExport = (format: 'csv' | 'json') => {
    try {
      if (format === 'csv') {
        exportToCSV(sortedTickets, `tickets-${new Date().toISOString().split('T')[0]}.csv`)
        showNotification('success', 'Exported to CSV')
      } else {
        exportToJSON(sortedTickets, `tickets-${new Date().toISOString().split('T')[0]}.json`)
        showNotification('success', 'Exported to JSON')
      }
    } catch (e: any) {
      showNotification('error', e?.message || 'Export failed')
    }
  }

  const handleAdvancedSearch = (query: string) => {
    setSearch(query)
  }

  const clearFilters = () => {
    setStatus('')
    setPriority('')
    setType('')
    setSiteId('')
    setAssignedUserId('')
    setSearch('')
    setDateFrom('')
    setDateTo('')
    localStorage.removeItem('dashboardFilters')
    showNotification('info', 'Filters cleared')
  }

  const activeFilters = [status, priority, type, siteId, assignedUserId, search, dateFrom, dateTo].filter(Boolean).length

  const sortedTickets = React.useMemo(() => {
    if (!sortColumn) return sortTickets(tickets, userId || undefined, cfg)
    const sorted = [...tickets].sort((a, b) => {
      let aVal: any = (a as any)[sortColumn]
      let bVal: any = (b as any)[sortColumn]
      if (sortColumn === 'createdAt' || sortColumn === 'updatedAt') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [tickets, sortColumn, sortDirection, userId, cfg])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const saveConfig = () => { 
    saveCfg(userId || 'default', cfg)
    refetch()
  }

  // Calculate statistics
  const stats = React.useMemo(() => {
    const byStatus: Record<string, number> = {}
    const byPriority: Record<string, number> = {}
    sortedTickets.forEach(t => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1
    })
    return { byStatus, byPriority, total: sortedTickets.length }
  }, [sortedTickets])

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} lg={9}>
        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              <TextField
                placeholder="Search description/details/type..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                size="small"
                sx={{ flex: 1, minWidth: 200 }}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                inputProps={{ 'aria-label': 'Search tickets' }}
              />
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select value={status} onChange={e => setStatus(e.target.value)} label="Status">
                  <MenuItem value="">All statuses</MenuItem>
                  {['NEW','TRIAGE','IN_PROGRESS','PENDING','RESOLVED','CLOSED'].map(s => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Tooltip title="Advanced search">
                <IconButton onClick={() => setShowAdvancedSearch(true)} aria-label="Advanced search">
                  <SearchIcon />
                </IconButton>
              </Tooltip>
              
              <Button
                variant={showFilters ? 'contained' : 'outlined'}
                startIcon={showFilters ? <ExpandLessIcon /> : <FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
                aria-label="Toggle filters"
              >
                Filters {activeFilters > 0 && `(${activeFilters})`}
              </Button>
              
              <Box sx={{ flexGrow: 1 }} />
              
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <Select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} aria-label="Page size">
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>
              
              <Tooltip title="Export to CSV">
                <IconButton onClick={() => handleExport('csv')} aria-label="Export to CSV">
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreate(true)}>
                Create Ticket
              </Button>
              
              <Tooltip title="Refresh">
                <IconButton onClick={() => refetch()} aria-label="Refresh tickets">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>

            <Collapse in={showFilters}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Priority</InputLabel>
                      <Select value={priority} onChange={e => setPriority(e.target.value)} label="Priority">
                        <MenuItem value="">All priorities</MenuItem>
                        {['P1','P2','P3','P4'].map(p => (
                          <MenuItem key={p} value={p}>{p}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Type</InputLabel>
                      <Select value={type} onChange={e => setType(e.target.value)} label="Type">
                        <MenuItem value="">All types</MenuItem>
                        {types.map(t => (
                          <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Site</InputLabel>
                      <Select value={siteId} onChange={e => setSiteId(e.target.value)} label="Site">
                        <MenuItem value="">All sites</MenuItem>
                        {sites.map(s => (
                          <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Assigned User</InputLabel>
                      <Select value={assignedUserId} onChange={e => setAssignedUserId(e.target.value)} label="Assigned User">
                        <MenuItem value="">All users</MenuItem>
                        {users.map(u => (
                          <MenuItem key={u.id} value={u.id}>{u.name || u.email}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Created From"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Created To"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Button fullWidth variant="outlined" onClick={clearFilters}>
                      Clear All
                    </Button>
                  </Grid>
                </Grid>
                
                {activeFilters > 0 && (
                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {status && (
                      <Chip label={`Status: ${status}`} onDelete={() => setStatus('')} size="small" />
                    )}
                    {priority && (
                      <Chip label={`Priority: ${priority}`} onDelete={() => setPriority('')} size="small" />
                    )}
                    {type && (
                      <Chip label={`Type: ${type}`} onDelete={() => setType('')} size="small" />
                    )}
                    {siteId && (
                      <Chip label={`Site: ${sites.find(s => s.id === siteId)?.name}`} onDelete={() => setSiteId('')} size="small" />
                    )}
                    {assignedUserId && (
                      <Chip label={`User: ${users.find(u => u.id === assignedUserId)?.name || users.find(u => u.id === assignedUserId)?.email}`} onDelete={() => setAssignedUserId('')} size="small" />
                    )}
                  </Box>
                )}
              </Paper>
            </Collapse>

            <Typography variant="body2" color="text.secondary">
              Showing {sortedTickets.length} ticket{sortedTickets.length !== 1 ? 's' : ''}
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={sortColumn === 'priority'}
                        direction={sortColumn === 'priority' ? sortDirection : 'desc'}
                        onClick={() => handleSort('priority')}
                      >
                        Priority
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortColumn === 'description'}
                        direction={sortColumn === 'description' ? sortDirection : 'desc'}
                        onClick={() => handleSort('description')}
                      >
                        Description
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortColumn === 'status'}
                        direction={sortColumn === 'status' ? sortDirection : 'desc'}
                        onClick={() => handleSort('status')}
                      >
                        Status
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Assigned</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortColumn === 'createdAt'}
                        direction={sortColumn === 'createdAt' ? sortDirection : 'desc'}
                        onClick={() => handleSort('createdAt')}
                      >
                        Created
                      </TableSortLabel>
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Skeleton variant="table" rows={5} />
                      </TableCell>
                    </TableRow>
                  ) : sortedTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <EmptyState
                          icon="search"
                          title="No tickets found"
                          description="Try adjusting your filters or create a new ticket"
                          action={{
                            label: 'Create Ticket',
                            onClick: () => setShowCreate(true)
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedTickets.map(t => (
                      <TicketRow key={t.id} ticket={t} users={users} />
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} lg={3}>
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Statistics</Typography>
              
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>By Status</Typography>
              <Stack spacing={0.5}>
                {Object.entries(stats.byStatus).map(([s, count]) => (
                  <Box key={s} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{s}:</Typography>
                    <Typography variant="body2" fontWeight={600}>{count}</Typography>
                  </Box>
                ))}
              </Stack>
              
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>By Priority</Typography>
              <Stack spacing={0.5}>
                {Object.entries(stats.byPriority).map(([p, count]) => (
                  <Box key={p} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{p}:</Typography>
                    <Typography variant="body2" fontWeight={600}>{count}</Typography>
                  </Box>
                ))}
              </Stack>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Total: {stats.total} tickets
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>My Prioritisation</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Configure how your dashboard orders tickets
              </Typography>
              
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Boost if assigned"
                  value={cfg.boostAssignedToMe}
                  onChange={e => setCfg({...cfg, boostAssignedToMe: Number(e.target.value)})}
                />
                
                <Typography variant="caption" color="text.secondary">Priority weights</Typography>
                {(['P1','P2','P3','P4'] as const).map(p => (
                  <TextField
                    key={p}
                    fullWidth
                    size="small"
                    type="number"
                    label={p}
                    value={cfg.weightPriority[p]}
                    onChange={e => setCfg({...cfg, weightPriority: {...cfg.weightPriority, [p]: Number(e.target.value)}})}
                  />
                ))}
                
                <Button variant="contained" onClick={saveConfig} fullWidth>
                  Save Configuration
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} maxWidth="md" fullWidth>
        <CreateTicket
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false)
            refetch()
          }}
        />
      </Dialog>
      
      {showAdvancedSearch && (
        <AdvancedSearch
          isOpen={showAdvancedSearch}
          onClose={() => setShowAdvancedSearch(false)}
          onSearch={handleAdvancedSearch}
          initialQuery={search}
        />
      )}
    </Grid>
  )
}
