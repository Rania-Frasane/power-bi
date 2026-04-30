'use client'

import { useState, useEffect } from 'react'
import { useDashboardBuilder, WidgetPosition } from '@/lib/dashboard-builder-context'
import { useAuth } from '@/lib/auth-context'
import { apiGet } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { X } from 'lucide-react'

interface Dataset {
  id: number
  name: string
  source_type: string
}

interface WidgetConfiguratorProps {
  datasets: Dataset[]
  onClose: () => void
}

const WIDGET_TYPES = [
  { value: 'bar', label: 'Bar Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'table', label: 'Data Table' },
  { value: 'kpi', label: 'KPI Card' },
  { value: 'metric', label: 'Metric Card' },
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'scatter', label: 'Scatter Plot' },
]

export function WidgetConfigurator({ datasets, onClose }: WidgetConfiguratorProps) {
  const { selectedWidgetId, widgets, updateWidget } = useDashboardBuilder()
  const { accessToken } = useAuth()
  const selectedWidget = selectedWidgetId ? widgets.find((w) => w.id === selectedWidgetId) : null

  const [formData, setFormData] = useState<Partial<WidgetPosition>>(
    selectedWidget || {
      name: '',
      type: 'bar',
      datasetId: null,
      config: {},
    }
  )
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    if (selectedWidget) {
      setFormData(selectedWidget)
    }
  }, [selectedWidget])

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleConfigChange = (configKey: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        [configKey]: value,
      },
    }))
  }

  const handleSave = () => {
    if (selectedWidget && formData) {
      updateWidget(selectedWidget.id, formData)
      onClose()
    }
  }

  useEffect(() => {
    const datasetId = formData.datasetId
    if (!accessToken || !datasetId) {
      setPreviewRows([])
      return
    }
    let cancelled = false
    ;(async () => {
      setLoadingPreview(true)
      try {
        const res = await apiGet(`/api/datasets/${datasetId}/data/?limit=200`, accessToken)
        if (!cancelled) {
          setPreviewRows(Array.isArray(res.data) ? res.data : [])
        }
      } catch {
        if (!cancelled) setPreviewRows([])
      } finally {
        if (!cancelled) setLoadingPreview(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [accessToken, formData.datasetId])

  const columns = previewRows.length > 0 ? Object.keys(previewRows[0]) : []
  const datasetLabel = datasets.find((d) => d.id === formData.datasetId)?.name || ''

  if (!selectedWidget) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Widget Configuration</CardTitle>
          <CardDescription>Select a widget to configure its settings</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No widget selected</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border h-full overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border">
        <div>
          <CardTitle>Widget Configuration</CardTitle>
          <CardDescription>Configure widget appearance and data</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 rounded-full"
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Name */}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Widget Name</FieldLabel>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Sales by Region"
              className="bg-background border-input"
            />
          </Field>
        </FieldGroup>

        {/* Type */}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="type">Chart Type</FieldLabel>
            <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
              <SelectTrigger className="bg-background border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {WIDGET_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        {/* Dataset */}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="dataset">Data Source</FieldLabel>
            {datasets.length > 0 ? (
              <Select
                value={formData.datasetId?.toString() || ''}
                onValueChange={(v) => {
                  const datasetId = parseInt(v)
                  handleChange('datasetId', datasetId)
                  handleConfigChange('datasetLabel', datasets.find((d) => d.id === datasetId)?.name || '')
                }}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Select a dataset" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {datasets.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground p-3 bg-muted rounded">
                No datasets available. Create one first.
              </div>
            )}
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input
              id="title"
              value={formData.config?.title || ''}
              onChange={(e) => handleConfigChange('title', e.target.value)}
              placeholder="Widget title"
              className="bg-background border-input"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="color">Primary Color</FieldLabel>
            <Input
              id="color"
              type="color"
              value={formData.config?.color || '#3b82f6'}
              onChange={(e) => handleConfigChange('color', e.target.value)}
              className="h-10 w-20 cursor-pointer"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="colorMode">Color Mode</FieldLabel>
            <Select
              value={formData.config?.colorMode || 'dynamic'}
              onValueChange={(v) => handleConfigChange('colorMode', v)}
            >
              <SelectTrigger className="bg-background border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="dynamic">Dynamic by data</SelectItem>
                <SelectItem value="custom">Custom color</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        {/* X-Axis (for charts) */}
        {['bar', 'line', 'scatter'].includes(formData.type as string) && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="xAxis">X-Axis Column</FieldLabel>
              <Select
                value={formData.config?.xAxis || ''}
                onValueChange={(v) => handleConfigChange('xAxis', v)}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Select X column" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        )}

        {/* Y-Axis (for charts) */}
        {['bar', 'line', 'scatter'].includes(formData.type as string) && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="yAxis">Y-Axis Column</FieldLabel>
              <Select
                value={formData.config?.yAxis || ''}
                onValueChange={(v) => handleConfigChange('yAxis', v)}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Select Y column" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        )}

        {formData.type === 'pie' && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="labelKey">Label Column</FieldLabel>
              <Select
                value={formData.config?.labelKey || ''}
                onValueChange={(v) => handleConfigChange('labelKey', v)}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Select label column" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="valueKey">Value Column</FieldLabel>
              <Select
                value={formData.config?.valueKey || ''}
                onValueChange={(v) => handleConfigChange('valueKey', v)}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Select value column" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        )}

        {formData.type === 'heatmap' && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="xAxisHeat">X Dimension</FieldLabel>
              <Select value={formData.config?.xAxis || ''} onValueChange={(v) => handleConfigChange('xAxis', v)}>
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Select X dimension" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="yAxisHeat">Y Dimension</FieldLabel>
              <Select value={formData.config?.yAxis || ''} onValueChange={(v) => handleConfigChange('yAxis', v)}>
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Select Y dimension" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="valueKeyHeat">Value</FieldLabel>
              <Select value={formData.config?.valueKey || ''} onValueChange={(v) => handleConfigChange('valueKey', v)}>
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Select value column" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        )}

        {['kpi', 'metric'].includes(formData.type as string) && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="metricColumn">Metric Column</FieldLabel>
              <Select value={formData.config?.metricColumn || ''} onValueChange={(v) => handleConfigChange('metricColumn', v)}>
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Select metric column" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="metricOperation">Operation</FieldLabel>
              <Select
                value={formData.config?.metricOperation || 'count'}
                onValueChange={(v) => handleConfigChange('metricOperation', v)}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="avg">Average</SelectItem>
                  <SelectItem value="max">Max</SelectItem>
                  <SelectItem value="min">Min</SelectItem>
                  <SelectItem value="last">Last value</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="unit">Unit</FieldLabel>
              <Input
                id="unit"
                value={formData.config?.unit || ''}
                onChange={(e) => handleConfigChange('unit', e.target.value)}
                placeholder="€, %, kg..."
                className="bg-background border-input"
              />
            </Field>
          </FieldGroup>
        )}

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="filterColumn">Optional Filter Column</FieldLabel>
            <Select value={formData.config?.filterColumn || ''} onValueChange={(v) => handleConfigChange('filterColumn', v)}>
              <SelectTrigger className="bg-background border-input">
                <SelectValue placeholder="No filter" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {columns.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="filterValue">Filter Value</FieldLabel>
            <Input
              id="filterValue"
              value={formData.config?.filterValue || ''}
              onChange={(e) => handleConfigChange('filterValue', e.target.value)}
              placeholder="Contains..."
              className="bg-background border-input"
            />
          </Field>
        </FieldGroup>

        {/* Aggregation */}
        {['bar', 'line'].includes(formData.type as string) && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="aggregation">Aggregation</FieldLabel>
              <Select
                value={formData.config?.aggregation || 'sum'}
                onValueChange={(v) => handleConfigChange('aggregation', v)}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="avg">Average</SelectItem>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="min">Min</SelectItem>
                  <SelectItem value="max">Max</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        )}

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="preview">Live Preview ({datasetLabel || 'No dataset'})</FieldLabel>
            <div className="max-h-40 overflow-auto rounded border border-border bg-muted/30 p-2 text-xs">
              {loadingPreview ? (
                <p className="text-muted-foreground">Loading preview…</p>
              ) : previewRows.length === 0 ? (
                <p className="text-muted-foreground">No preview rows.</p>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {columns.slice(0, 5).map((c) => (
                        <th key={c} className="border-b border-border px-1 py-1 text-left">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        {columns.slice(0, 5).map((c) => (
                          <td key={c} className="px-1 py-1">
                            {String(row[c] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Field>
        </FieldGroup>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Apply
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-border hover:bg-muted"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
