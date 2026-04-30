'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  data: Record<string, unknown>[]
  columns: string[]
  title: string
}

export function DataTableWidget({ data, columns }: Props) {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const sourceData =
    data.length > 0
      ? data
      : [
          { id: 1, city: 'Casablanca', property_type: 'Apartment', price: 145000, area_m2: 94 },
          { id: 2, city: 'Rabat', property_type: 'Villa', price: 320000, area_m2: 210 },
          { id: 3, city: 'Marrakech', property_type: 'Studio', price: 89000, area_m2: 46 },
        ]
  const visibleColumns = columns.length > 0 ? columns : Object.keys(sourceData[0] ?? {})

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sourceData
    return sourceData.filter((row) =>
      visibleColumns.some((col) =>
        String(row[col] ?? '').toLowerCase().includes(q),
      ),
    )
  }, [sourceData, visibleColumns, query])

  const sorted = useMemo(() => {
    if (!sortBy) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortBy]
      const bv = b[sortBy]
      const left = typeof av === 'number' ? av : String(av ?? '')
      const right = typeof bv === 'number' ? bv : String(bv ?? '')
      if (left < right) return sortDir === 'asc' ? -1 : 1
      if (left > right) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = sorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  const activeColumns = visibleColumns

  return (
    <div className="space-y-2">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setPage(1)
        }}
        placeholder="Search..."
        className="h-8"
      />
      <div className="max-h-[300px] overflow-auto rounded-md border border-border bg-background">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-muted">
            <tr>
              {activeColumns.map((col) => (
                <th
                  key={col}
                  className="cursor-pointer border-b border-border px-2 py-1 text-left"
                  onClick={() => {
                    if (sortBy === col) {
                      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                    } else {
                      setSortBy(col)
                      setSortDir('asc')
                    }
                  }}
                >
                  {col}
                  {sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, idx) => (
              <tr key={idx} className="border-b border-border/60">
                {activeColumns.map((col) => {
                  const raw = row[col]
                  const numeric = typeof raw === 'number'
                  return (
                    <td
                      key={`${idx}-${col}`}
                      className={`px-2 py-1 ${numeric ? 'text-right' : 'text-left'}`}
                    >
                      {String(raw ?? '')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Page {safePage} / {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  )
}
