export type ColumnMapping = {
  x?: string
  y?: string
  label?: string
  value?: string
  columns?: string[]
}

export type WidgetConfig = {
  id: string
  type: 'bar' | 'line' | 'pie' | 'table' | 'heatmap' | 'scatter' | 'kpi' | 'metric'
  title: string
  datasetId: string | number | null
  columnMapping: ColumnMapping
  layout: { x: number; y: number; w: number; h: number }
  config?: Record<string, unknown>
}

export type DashboardPersistedConfig = {
  widgets: WidgetConfig[]
}

const STORAGE_KEY = 'dashboard_config'

function normalizeWidgetConfig(input: Partial<WidgetConfig>): WidgetConfig {
  return {
    id: String(input.id ?? `widget-${Date.now()}`),
    type: (input.type as WidgetConfig['type']) ?? 'bar',
    title: input.title ?? 'Untitled Widget',
    datasetId: input.datasetId ?? null,
    columnMapping: {
      x: input.columnMapping?.x ?? '',
      y: input.columnMapping?.y ?? '',
      label: input.columnMapping?.label ?? '',
      value: input.columnMapping?.value ?? '',
      columns: Array.isArray(input.columnMapping?.columns)
        ? input.columnMapping?.columns
        : [],
    },
    layout: {
      x: input.layout?.x ?? 0,
      y: input.layout?.y ?? 0,
      w: input.layout?.w ?? 4,
      h: input.layout?.h ?? 3,
    },
    config:
      input.config && typeof input.config === 'object'
        ? (input.config as Record<string, unknown>)
        : {},
  }
}

export function saveDashboard(widgets: WidgetConfig[]): void {
  if (typeof window === 'undefined') return
  const payload: DashboardPersistedConfig = {
    widgets: widgets.map((w) => normalizeWidgetConfig(w)),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function loadDashboard(): WidgetConfig[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as DashboardPersistedConfig
    if (!Array.isArray(parsed.widgets)) return []
    return parsed.widgets.map((w) => normalizeWidgetConfig(w))
  } catch {
    return []
  }
}
