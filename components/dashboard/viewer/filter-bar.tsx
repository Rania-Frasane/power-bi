'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Filter } from 'lucide-react'

export interface FilterValue {
  id: string
  name: string
  type: 'text' | 'number' | 'select' | 'date'
  value: string | number | null
  column: string
  options?: { label: string; value: string }[]
}

interface FilterBarProps {
  filters: FilterValue[]
  onFilterChange: (filterId: string, value: string | number | null) => void
  onFilterRemove: (filterId: string) => void
  onAddFilter?: () => void
}

export function FilterBar({
  filters,
  onFilterChange,
  onFilterRemove,
  onAddFilter,
}: FilterBarProps) {
  const [expandedFilters, setExpandedFilters] = useState(true)

  if (!filters || filters.length === 0) {
    return null
  }

  return (
    <Card className="bg-card border-border">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Filters</h3>
            <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
              {filters.filter((f) => f.value !== null).length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedFilters(!expandedFilters)}
            className="text-xs h-7"
          >
            {expandedFilters ? 'Collapse' : 'Expand'}
          </Button>
        </div>

        {expandedFilters && (
          <div className="space-y-3">
            {filters.map((filter) => (
              <div key={filter.id} className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2">
                  <label className="text-sm font-medium text-foreground min-w-fit">
                    {filter.name}
                  </label>

                  {filter.type === 'text' && (
                    <Input
                      placeholder="Enter text..."
                      value={filter.value as string || ''}
                      onChange={(e) => onFilterChange(filter.id, e.target.value || null)}
                      className="h-8 text-sm bg-background border-input"
                    />
                  )}

                  {filter.type === 'number' && (
                    <Input
                      type="number"
                      placeholder="Enter number..."
                      value={filter.value as number || ''}
                      onChange={(e) =>
                        onFilterChange(filter.id, e.target.value ? parseFloat(e.target.value) : null)
                      }
                      className="h-8 text-sm bg-background border-input"
                    />
                  )}

                  {filter.type === 'select' && filter.options && (
                    <Select
                      value={filter.value as string || ''}
                      onValueChange={(v) => onFilterChange(filter.id, v || null)}
                    >
                      <SelectTrigger className="h-8 text-sm bg-background border-input">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="">Clear</SelectItem>
                        {filter.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {filter.type === 'date' && (
                    <Input
                      type="date"
                      value={filter.value as string || ''}
                      onChange={(e) => onFilterChange(filter.id, e.target.value || null)}
                      className="h-8 text-sm bg-background border-input"
                    />
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFilterRemove(filter.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
