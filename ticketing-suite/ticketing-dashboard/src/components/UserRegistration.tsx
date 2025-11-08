import React from 'react'
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Typography,
} from '@mui/material'
import { Modal } from './common'
import { useUsers } from '../hooks/useDirectory'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const client = axios.create({ baseURL: API_BASE })
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || ''
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

interface UserRegistrationProps {
  onClose: () => void
  onSuccess?: () => void
}

export default function UserRegistration({ onClose, onSuccess }: UserRegistrationProps) {
  const { data: users = [], refetch: refetchUsers } = useUsers()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    name: '',
    role: 'USER' as 'USER' | 'ADMIN',
    tenantId: ''
  })

  React.useEffect(() => {
    // Try to get tenantId from JWT token (if available)
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.tenantId) {
          setFormData(prev => ({ ...prev, tenantId: payload.tenantId }))
        }
      } catch {}
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email || !formData.password || !formData.name) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await client.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        tenantId: formData.tenantId
      })
      onSuccess?.()
      refetchUsers()
      setFormData({ email: '', password: '', name: '', role: 'USER', tenantId: formData.tenantId })
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to register user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Register New User (Admin Only)"
      maxWidth="md"
      actions={
        <>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="user-registration-form"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register User'}
          </Button>
        </>
      }
    >
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" id="user-registration-form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              required
              type="email"
              size="small"
              label="Email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
              inputProps={{ 'aria-label': 'Email' }}
            />

            <TextField
              fullWidth
              required
              type="password"
              size="small"
              label="Password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 6 characters"
              inputProps={{ minLength: 6, 'aria-label': 'Password' }}
            />

            <TextField
              fullWidth
              required
              size="small"
              label="Name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Full name"
              inputProps={{ 'aria-label': 'Name' }}
            />

            <FormControl fullWidth size="small" required>
              <InputLabel id="role-label">Role</InputLabel>
              <Select
                labelId="role-label"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as 'USER' | 'ADMIN' })}
                label="Role"
                aria-label="Role"
              >
                <MenuItem value="USER">USER</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
              </Select>
            </FormControl>

            {formData.tenantId && (
              <TextField
                fullWidth
                size="small"
                label="Tenant ID"
                value={formData.tenantId}
                onChange={e => setFormData({ ...formData, tenantId: e.target.value })}
                placeholder="Tenant ID (auto-filled from token)"
                inputProps={{ 'aria-label': 'Tenant ID' }}
              />
            )}
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="h6" gutterBottom>
            Existing Users
          </Typography>
          {users.length === 0 ? (
            <Typography color="text.secondary">No users found.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={u.role}
                          size="small"
                          color={u.role === 'ADMIN' ? 'error' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>
    </Modal>
  )
}
