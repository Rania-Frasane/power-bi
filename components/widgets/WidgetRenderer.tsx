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
}

export function WidgetRenderer({
  widget,
  isEditMode,
  onOpenConfig,
  onDuplicate,
  onDelete,
}: Props) {
  const { data, columns, status, error, refetch } = useDataset({
    datasetId: widget.datasetId,
    columnMapping: {
      x: widget.columnMapping.x,
      y: widget.columnMapping.y,
      label: widget.columnMapping.label,
      value: widget.columnMapping.value,
      columns: widget.columnMapping.columns,
    },
  })

  const resolvedMapping = (() => {
    const fallbackColumns = columns
    const numericCols = fallbackColumns.filter((c) =>
      data.some((row) => typeof row[c] === 'number'),
    )
    const x = widget.columnMapping.x || fallbackColumns[0] || ''
    const y = widget.columnMapping.y || numericCols[0] || fallbackColumns[1] || fallbackColumns[0] || ''
    const label = widget.columnMapping.label || fallbackColumns[0] || ''
    const value = widget.columnMapping.value || numericCols[0] || fallbackColumns[1] || fallbackColumns[0] || ''
    return { x, y, label, value }
  })()

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
      <CardContent className="h-[calc(100%-56px)] overflow-hidden">
        {status === 'idle' ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Dataset not configured.
          </div>
        ) : null}
        {status === 'loading' ? (
          <div className="h-full w-full animate-pulse rounded-md bg-muted/60" />
        ) : null}
        {status === 'error' ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-destructive">
            <p>{error || 'Failed to load dataset'}</p>
            <Button size="sm" variant="outline" onClick={refetch}>
              Retry
            </Button>
          </div>
        ) : null}
        {status === 'ready' ? (
          widget.type === 'table' ? (
            <DataTableWidget
              data={data}
              columns={widget.columnMapping.columns ?? []}
              title={widget.title}
            />
          ) : widget.type === 'bar' || widget.type === 'line' || widget.type === 'pie' ? (
            <ChartWidget
              type={widget.type as 'bar' | 'line' | 'pie'}
              data={data}
              columnMapping={resolvedMapping}
              title={widget.title}
            />
          ) : widget.type === 'scatter' ? (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={resolvedMapping.x} name={resolvedMapping.x} />
                <YAxis dataKey={resolvedMapping.y} name={resolvedMapping.y} />
                <Tooltip />
                <Scatter data={data} fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : widget.type === 'kpi' || widget.type === 'metric' ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {resolvedMapping.y || resolvedMapping.value || 'Metric'}
                </p>
                <p className="text-4xl font-bold text-foreground">
                  {data.length.toLocaleString()}
                </p>
              </div>
            </div>
          ) : widget.type === 'heatmap' ? (
            <div className="grid grid-cols-6 gap-1 p-2">
              {data.slice(0, 48).map((row, idx) => {
                const raw =
                  Number(
                    row[widget.columnMapping.value || widget.columnMapping.y || ''] ?? 0,
                    row[resolvedMapping.value || resolvedMapping.y || ''] ?? 0,
                  ) || 0
                const alpha = Math.max(0.15, Math.min(0.95, raw / 100))
                return (
                  <div
                    key={idx}
                    className="flex h-10 items-center justify-center rounded text-[10px]"
                    style={{ backgroundColor: `rgba(59,130,246,${alpha})` }}
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
