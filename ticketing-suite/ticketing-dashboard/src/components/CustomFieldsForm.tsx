import React from 'react'
import type { FieldDefOpt } from '../lib/directory'

interface CustomFieldsFormProps {
  fieldDefs: FieldDefOpt[]
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
}

export default function CustomFieldsForm({ fieldDefs, values, onChange }: CustomFieldsFormProps) {
  const updateField = (key: string, value: any) => {
    onChange({ ...values, [key]: value })
  }

  const renderField = (def: FieldDefOpt) => {
    const value = values[def.key] ?? ''

    switch (def.datatype) {
      case 'string':
        return (
          <input
            type="text"
            value={value}
            onChange={e => updateField(def.key, e.target.value)}
            placeholder={def.label}
            required={def.required}
            style={{ flex: 1 }}
          />
        )
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={e => updateField(def.key, e.target.value ? Number(e.target.value) : '')}
            placeholder={def.label}
            required={def.required}
            style={{ flex: 1 }}
          />
        )
      
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={value === true}
            onChange={e => updateField(def.key, e.target.checked)}
            style={{ width: 'auto' }}
          />
        )
      
      case 'date':
        return (
          <input
            type="date"
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={e => updateField(def.key, e.target.value ? new Date(e.target.value).toISOString() : '')}
            required={def.required}
            style={{ flex: 1 }}
          />
        )
      
      case 'enum':
        return (
          <select
            value={value}
            onChange={e => updateField(def.key, e.target.value)}
            required={def.required}
            style={{ flex: 1 }}
          >
            <option value="">Select {def.label}</option>
            {def.enumOptions?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )
      
      default:
        return null
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {fieldDefs.map(def => (
        <div key={def.key} className="row" style={{ marginTop: 8 }}>
          <label style={{ width: 150 }}>
            {def.label}
            {def.required && <span style={{ color: '#ffb3b3', marginLeft: 4 }}>*</span>}
          </label>
          {renderField(def)}
        </div>
      ))}
    </div>
  )
}

