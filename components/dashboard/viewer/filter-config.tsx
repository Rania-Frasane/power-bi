'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { FilterValue } from './filter-bar'
import { Plus, X } from 'lucide-react'

interface FilterConfigProps {
  availableColumns: string[]
  onAddFilter: (filter: FilterValue) => void
}

const FILTER_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
]

export function FilterConfig({ availableColumns, onAddFilter }: FilterConfigProps) {
  const [selectedColumn, setSelectedColumn] = useState('')
  const [selectedType, setSelectedType] = useState('text')
  const [filterName, setFilterName] = useState('')

  const handleAddFilter = () => {
    if (!selectedColumn || !filterName) return

    const newFilter: FilterValue = {
      id: `filter-${Date.now()}`,
      name: filterName,
      type: selectedType as 'text' | 'number' | 'select' | 'date',
      value: null,
      column: selectedColumn,
    }

    onAddFilter(newFilter)

    // Reset form
    setSelectedColumn('')
    setSelectedType('text')
    setFilterName('')
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base">Add Filter</CardTitle>
        <CardDescription>Create a new filter for your dashboard</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="filter-name">Filter Name</FieldLabel>
            <Input
              id="filter-name"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="e.g., Region, Date Range"
              className="bg-background border-input"
            />
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="filter-column">Data Column</FieldLabel>
            <Select value={selectedColumn} onValueChange={setSelectedColumn}>
              <SelectTrigger className="bg-background border-input">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {availableColumns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="filter-type">Filter Type</FieldLabel>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-background border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {FILTER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <Button
          onClick={handleAddFilter}
          disabled={!selectedColumn || !filterName}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Filter
        </Button>
      </CardContent>
    </Card>
  )
}
