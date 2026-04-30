'use client'

import { WidgetRenderer as UnifiedWidgetRenderer } from '@/components/widgets/WidgetRenderer'
import { WidgetPosition } from '@/lib/dashboard-builder-context'
import type { WidgetConfig } from '@/store/dashboardStore'

interface WidgetRendererProps {
  widget: WidgetPosition
  data: any[]
  isLoading?: boolean
  error?: string | null
}

function toWidgetConfig(widget: WidgetPosition): WidgetConfig {
  const columnMapping = {
    x: widget.config?.xAxis || '',
    y: widget.config?.yAxis || '',
    label: widget.config?.labelKey || widget.config?.xAxis || '',
    value: widget.config?.valueKey || widget.config?.yAxis || '',
    columns: Array.isArray(widget.config?.columns) ? widget.config.columns : [],
  }

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
    title: widget.config?.title || widget.name,
    datasetId: widget.datasetId,
    columnMapping,
    layout: { x: widget.x, y: widget.y, w: widget.width, h: widget.height },
  }
}

export function WidgetRenderer({ widget }: WidgetRendererProps) {
  return (
    <UnifiedWidgetRenderer
      widget={toWidgetConfig(widget)}
      isEditMode={false}
    />
  )
}
