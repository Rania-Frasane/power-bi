'use client'

import { useDashboardBuilder, WidgetPosition } from '@/lib/dashboard-builder-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Copy, Trash2, Settings } from 'lucide-react'

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

export function WidgetCard({ widget, isSelected, onSelect, onEdit }: WidgetCardProps) {
  const { removeWidget, duplicateWidget } = useDashboardBuilder()

  return (
    <div
      className={`absolute transition-all ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-2 hover:ring-muted'
      }`}
      style={{
        left: `${widget.x * 50}px`,
        top: `${widget.y * 50}px`,
        width: `${widget.width * 50}px`,
        height: `${widget.height * 50}px`,
      }}
    >
      <Card
        onClick={onSelect}
        className="w-full h-full flex flex-col bg-card border-border cursor-move hover:border-primary transition-colors"
      >
        <div className="flex-1 p-4 flex flex-col gap-2">
          <div>
            <h3 className="font-semibold text-sm text-foreground truncate">{widget.name}</h3>
            <p className="text-xs text-muted-foreground">{WIDGET_TYPE_LABELS[widget.type]}</p>
          </div>
          {widget.datasetId && (
            <p className="text-xs text-muted-foreground truncate">
              Dataset: {widget.config?.datasetLabel || widget.datasetId}
            </p>
          )}
        </div>

        {isSelected && (
          <div className="flex gap-1 p-2 border-t border-border bg-muted">
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
      </Card>
    </div>
  )
}
