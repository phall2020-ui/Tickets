import React from 'react'
import { Chip, ChipProps } from '@mui/material'
import { getStatusLabel } from '../../lib/statuses'

interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: string
}

const getStatusColor = (status: string): ChipProps['color'] => {
  // Default colors for common statuses
  const upperStatus = status.toUpperCase()
  if (upperStatus.includes('AWAIT') || upperStatus === 'NEW') return 'info'
  if (upperStatus.includes('PROGRESS') || upperStatus.includes('RESPOND')) return 'primary'
  if (upperStatus.includes('HOLD') || upperStatus.includes('PENDING')) return 'warning'
  if (upperStatus.includes('CLOSE') || upperStatus.includes('DONE')) return 'default'
  return 'default'
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, ...props }) => {
  const label = getStatusLabel(status)
  const color = getStatusColor(status)
  
  return (
    <Chip
      label={label}
      color={color}
      size="small"
      variant="outlined"
      {...props}
      aria-label={`Status: ${label}`}
    />
  )
}
