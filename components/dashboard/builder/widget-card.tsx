'use client'

import { useDashboardBuilder, WidgetPosition } from '@/lib/dashboard-builder-context'
import { Button } from '@/components/ui/button'
import { Copy, Trash2, Settings } from 'lucide-react'
import { WidgetRenderer as UnifiedWidgetRenderer } from '@/components/widgets/WidgetRenderer'
import { useDataset } from '@/hooks/useDataset'
import type { WidgetConfig } from '@/store/dashboardStore'

interface WidgetCardProps {
  widget: WidgetPosition
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
}

const WIDGET_TYPE_LABELS: Record<string, string> = {
  bar: 'Bar Chart',
  line: 'Line Chart',
  pie: 'Pie Chart',
  table: 'Data Table',
  kpi: 'KPI Card',
  metric: 'Metric Card',
  heatmap: 'Heatmap',
  scatter: 'Scatter Plot',
}
const GRID_SIZE = 60

function toWidgetConfig(widget: WidgetPosition): WidgetConfig {
  return {
    id: widget.id,
    type:
      widget.type === 'bar' ||
      widget.type === 'line' ||
      widget.type === 'pie' ||
      widget.type === 'table' ||
      widget.type === 'heatmap' ||
      widget.type === 'scatter' ||
      widget.type === 'kpi' ||
      widget.type === 'metric'
        ? widget.type
        : 'bar',
    title: widget.config?.title || widget.name || WIDGET_TYPE_LABELS[widget.type] || 'Widget',
    datasetId: widget.datasetId,
    columnMapping: {
      x: widget.config?.xAxis || '',
      y: widget.config?.yAxis || '',
      label: widget.config?.labelKey || '',
      value: widget.config?.valueKey || '',
      columns: Array.isArray(widget.config?.columns) ? widget.config.columns : [],
    },
    layout: { x: widget.x, y: widget.y, w: widget.width, h: widget.height },
  }
}

export function WidgetCard({ widget, isSelected, onSelect, onEdit }: WidgetCardProps) {
  const { removeWidget, duplicateWidget } = useDashboardBuilder()
  const widgetConfig = toWidgetConfig(widget)
  const dataset = useDataset({
    datasetId: widget.datasetId,
    columnMapping: widgetConfig.columnMapping,
  })

  return (
    <div
      className={`absolute transition-all ${
        isSelected ? 'ring-2 ring-primary/80 ring-offset-2' : 'hover:ring-2 hover:ring-muted'
      }`}
      style={{
        left: `${widget.x * GRID_SIZE}px`,
        top: `${widget.y * GRID_SIZE}px`,
        width: `${widget.width * GRID_SIZE}px`,
        height: `${widget.height * GRID_SIZE}px`,
      }}
    >
      <div
        onClick={onSelect}
        className="relative h-full w-full cursor-move overflow-hidden rounded-xl border border-border bg-card/95 shadow-sm transition-colors hover:border-primary"
      >
        <UnifiedWidgetRenderer
          widget={widgetConfig}
          isEditMode={false}
          prefetchedData={dataset.data}
          prefetchedStatus={dataset.status}
          prefetchedError={dataset.error}
        />

        {isSelected && (
          <div className="absolute bottom-0 left-0 right-0 flex gap-1 border-t border-border bg-background/95 p-2 backdrop-blur">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs hover:bg-background"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              title="Edit widget"
            >
              <Settings className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs hover:bg-background"
              onClick={(e) => {
                e.stopPropagation()
                duplicateWidget(widget.id)
              }}
              title="Duplicate widget"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs hover:bg-destructive/20 text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                removeWidget(widget.id)
              }}
              title="Delete widget"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
