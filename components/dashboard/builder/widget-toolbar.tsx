'use client'

import { useEffect, useState } from 'react'
import { useDashboardBuilder } from '@/lib/dashboard-builder-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  BarChart3,
  LineChart,
  PieChart,
  Table2,
  Zap,
  Activity,
  Grid3x3,
  ScatterChart,
  Plus,
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface Dataset {
  id: number
  name: string
  source_type: string
}

interface WidgetToolbarProps {
  datasets: Dataset[]
}

const WIDGET_OPTIONS = [
  { type: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { type: 'line', label: 'Line Chart', icon: LineChart },
  { type: 'pie', label: 'Pie Chart', icon: PieChart },
  { type: 'table', label: 'Data Table', icon: Table2 },
  { type: 'kpi', label: 'KPI Card', icon: Zap },
  { type: 'metric', label: 'Metric Card', icon: Activity },
  { type: 'heatmap', label: 'Heatmap', icon: Grid3x3 },
  { type: 'scatter', label: 'Scatter Plot', icon: ScatterChart },
]

export function WidgetToolbar({ datasets }: WidgetToolbarProps) {
  const { addWidget } = useDashboardBuilder()
  const [selectedDataset, setSelectedDataset] = useState<number | null>(
    datasets.length > 0 ? datasets[0].id : null
  )

  useEffect(() => {
    if (datasets.length === 0) {
      setSelectedDataset(null)
      return
    }
    if (!selectedDataset || !datasets.some((d) => d.id === selectedDataset)) {
      setSelectedDataset(datasets[0].id)
    }
  }, [datasets, selectedDataset])

  const handleAddWidget = (type: string) => {
    if (!selectedDataset) return
    const newWidget = {
      id: `widget-${Date.now()}`,
      x: 0,
      y: 0,
      width: 8,
      height: 6,
      type: type as any,
      name: WIDGET_OPTIONS.find((w) => w.type === type)?.label || 'New Widget',
      datasetId: selectedDataset,
      config: {},
    }
    addWidget(newWidget)
  }

  return (
    <Card className="rounded-xl border-border bg-card/90 p-4 shadow-sm backdrop-blur">
      <div className="space-y-4">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">Add Widgets</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Pick a visual and drop it into the canvas.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {WIDGET_OPTIONS.map(({ type, label, icon: Icon }) => (
              <Popover key={type}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto min-h-16 flex-col gap-1.5 border-border bg-background/70 py-2 hover:bg-muted"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{label}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 bg-card border-border p-3">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-foreground">Dataset Source</label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {datasets.length > 0
                          ? datasets.find((d) => d.id === selectedDataset)?.name ||
                            'Select a dataset'
                          : 'No datasets available'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={!selectedDataset}
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => {
                          handleAddWidget(type)
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ))}
          </div>
        </div>

        {datasets.length > 0 && (
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2 uppercase">
              Default Dataset
            </h4>
            <select
              value={selectedDataset || ''}
              onChange={(e) => setSelectedDataset(parseInt(e.target.value))}
              className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </Card>
  )
}
