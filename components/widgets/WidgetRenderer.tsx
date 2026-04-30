'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDataset } from '@/hooks/useDataset'
import type { WidgetConfig } from '@/store/dashboardStore'
import { ChartWidget } from './ChartWidget'
import { DataTableWidget } from './DataTableWidget'
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Props = {
  widget: WidgetConfig
  isEditMode: boolean
  onOpenConfig?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  prefetchedData?: Record<string, unknown>[]
  prefetchedStatus?: 'idle' | 'loading' | 'ready' | 'error'
  prefetchedError?: string | null
}

function buildPreviewData() {
  return [
    { month: 'Jan', revenue: 12000, deals: 32, city: 'Casablanca', quality: 54 },
    { month: 'Feb', revenue: 14100, deals: 37, city: 'Rabat', quality: 63 },
    { month: 'Mar', revenue: 16550, deals: 41, city: 'Marrakech', quality: 72 },
    { month: 'Apr', revenue: 15880, deals: 39, city: 'Tangier', quality: 68 },
    { month: 'May', revenue: 18240, deals: 45, city: 'Agadir', quality: 79 },
    { month: 'Jun', revenue: 20110, deals: 49, city: 'Kenitra', quality: 84 },
  ] as Record<string, unknown>[]
}

// Colors are fixed (no per-widget customization).

export function WidgetRenderer({
  widget,
  isEditMode,
  onOpenConfig,
  onDuplicate,
  onDelete,
  prefetchedData,
  prefetchedStatus,
  prefetchedError,
}: Props) {
  const dataset = useDataset({
    datasetId: widget.datasetId,
    columnMapping: {
      x: widget.columnMapping.x,
      y: widget.columnMapping.y,
      label: widget.columnMapping.label,
      value: widget.columnMapping.value,
      columns: widget.columnMapping.columns,
    },
  })
  const data = prefetchedData ?? dataset.data
  const columns = data.length > 0 ? Object.keys(data[0]) : dataset.columns
  const status = prefetchedStatus ?? dataset.status
  const error = prefetchedError ?? dataset.error
  const refetch = dataset.refetch
  const previewData = buildPreviewData()
  const showPreview = status !== 'ready'
  const effectiveData = showPreview
    ? (data.length > 0 ? data : previewData)
    : data
  const effectiveStatus = showPreview ? 'ready' : status

  const resolvedMapping = (() => {
    const fallbackColumns = columns
    const numericCols = fallbackColumns.filter((c) =>
      effectiveData.some((row) => typeof row[c] === 'number'),
    )
    const x = widget.columnMapping.x || fallbackColumns[0] || 'month'
    const y =
      widget.columnMapping.y ||
      numericCols[0] ||
      fallbackColumns[1] ||
      fallbackColumns[0] ||
      'revenue'
    const label = widget.columnMapping.label || fallbackColumns[0] || 'city'
    const value =
      widget.columnMapping.value ||
      numericCols[0] ||
      fallbackColumns[1] ||
      fallbackColumns[0] ||
      'deals'
    return { x, y, label, value }
  })()

  // Fixed styling (no user-custom colors / no data-driven color modes)

  const kpiValue =
    widget.type === 'kpi' || widget.type === 'metric' ? effectiveData.length : 0
  const kpiTone = 'text-foreground'

  return (
    <Card className="relative h-full overflow-hidden border-border bg-card">
      {isEditMode ? (
        <div className="absolute right-2 top-2 z-10 flex gap-1 rounded bg-background/80 p-1">
          <Button size="sm" variant="outline" onClick={onOpenConfig}>
            ⚙️
          </Button>
          <Button size="sm" variant="outline" onClick={onDuplicate}>
            Copy
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete}>
            Delete
          </Button>
        </div>
      ) : null}
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent className="relative h-[calc(100%-56px)] overflow-hidden">
        {showPreview ? (
          <div className="absolute right-2 top-2 z-20 rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Preview data
          </div>
        ) : null}
        {status === 'error' && !showPreview ? (
          <div className="absolute left-3 top-2 z-20 flex items-center gap-2 text-xs text-destructive">
            <span>{error || 'Load error'}</span>
            <Button size="sm" variant="outline" className="h-6 px-2" onClick={refetch}>
              Retry
            </Button>
          </div>
        ) : null}
        {effectiveStatus === 'ready' ? (
          widget.type === 'table' ? (
            <DataTableWidget
              data={effectiveData}
              columns={widget.columnMapping.columns ?? []}
              title={widget.title}
            />
          ) : widget.type === 'bar' || widget.type === 'line' || widget.type === 'pie' ? (
            <ChartWidget
              type={widget.type as 'bar' | 'line' | 'pie'}
              data={effectiveData}
              columnMapping={resolvedMapping}
              title={widget.title}
            />
          ) : widget.type === 'scatter' ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={resolvedMapping.x} name={resolvedMapping.x} />
                <YAxis dataKey={resolvedMapping.y} name={resolvedMapping.y} />
                <Tooltip />
                <Scatter data={effectiveData} fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : widget.type === 'kpi' || widget.type === 'metric' ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {resolvedMapping.y || resolvedMapping.value || 'Metric'}
                </p>
                <p
                  className={`text-4xl font-bold ${kpiTone}`}
                >
                  {kpiValue.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Records analyzed</p>
              </div>
            </div>
          ) : widget.type === 'heatmap' ? (
            <div className="grid grid-cols-6 gap-1 p-2">
              {effectiveData.slice(0, 48).map((row, idx) => {
                const raw = Number(row[resolvedMapping.value || resolvedMapping.y || ''] ?? 0) || 0
                const alpha = Math.max(0.15, Math.min(0.95, raw / 100))
                return (
                  <div
                    key={idx}
                    className="flex h-10 items-center justify-center rounded text-[10px]"
                    style={{
                      backgroundColor: `rgba(59,130,246,${alpha})`,
                    }}
                    title={`${String(row[resolvedMapping.x || ''] ?? '')} / ${String(row[resolvedMapping.y || ''] ?? '')}: ${raw}`}
                  >
                    {raw.toFixed(0)}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Unsupported widget type
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  )
}
