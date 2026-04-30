'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fetchDatasetList } from '@/lib/api/datasets'
import { useDataset } from '@/hooks/useDataset'
import type { WidgetConfig } from '@/store/dashboardStore'
import { ChartWidget } from '@/components/widgets/ChartWidget'
import { DataTableWidget } from '@/components/widgets/DataTableWidget'

type Props = {
  widget: WidgetConfig
  onApply: (updated: WidgetConfig) => void
  onClose: () => void
}

export function WidgetConfigPanel({ widget, onApply, onClose }: Props) {
  const [datasets, setDatasets] = useState<{ id: number; name: string }[]>([])
  const [datasetId, setDatasetId] = useState<string | number | null>(widget.datasetId)
  const [columnMapping, setColumnMapping] = useState(widget.columnMapping)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchDatasetList()
        if (!cancelled) setDatasets(list.map((d) => ({ id: d.id, name: d.name })))
      } catch {
        if (!cancelled) setDatasets([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const { data, columns } = useDataset({
    datasetId,
    columnMapping,
  })

  const previewData = useMemo(() => data.slice(0, 20), [data])

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <p className="mb-2 text-sm font-medium">Dataset</p>
        <Select
          value={datasetId != null ? String(datasetId) : ''}
          onValueChange={(v) => setDatasetId(v ? Number(v) : null)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select dataset" />
          </SelectTrigger>
          <SelectContent>
            {datasets.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name} (#{d.id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(widget.type === 'bar' || widget.type === 'line') && (
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={columnMapping.x || ''}
            onValueChange={(v) => setColumnMapping((m) => ({ ...m, x: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Axe X" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={columnMapping.y || ''}
            onValueChange={(v) => setColumnMapping((m) => ({ ...m, y: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Axe Y" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {widget.type === 'pie' && (
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={columnMapping.label || ''}
            onValueChange={(v) => setColumnMapping((m) => ({ ...m, label: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Label" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={columnMapping.value || ''}
            onValueChange={(v) => setColumnMapping((m) => ({ ...m, value: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Value" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {widget.type === 'table' && (
        <div className="space-y-2">
          <p className="text-sm">Colonnes</p>
          <Input
            placeholder="col1,col2,col3 (empty = toutes)"
            value={(columnMapping.columns ?? []).join(',')}
            onChange={(e) =>
              setColumnMapping((m) => ({
                ...m,
                columns: e.target.value
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean),
              }))
            }
          />
        </div>
      )}

      <div className="rounded border border-border p-2">
        <p className="mb-2 text-xs text-muted-foreground">Aperçu live (20 lignes max)</p>
        {widget.type === 'table' ? (
          <DataTableWidget
            data={previewData}
            columns={columnMapping.columns ?? []}
            title={widget.title}
          />
        ) : (
          <ChartWidget
            type={widget.type as 'bar' | 'line' | 'pie'}
            data={previewData}
            columnMapping={columnMapping}
            title={widget.title}
          />
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            onApply({
              ...widget,
              datasetId,
              columnMapping,
            })
            onClose()
          }}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
