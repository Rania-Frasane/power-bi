'use client'

import { useState, useEffect } from 'react'
import { useDashboardBuilder, WidgetPosition } from '@/lib/dashboard-builder-context'
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
  const selectedWidget = selectedWidgetId ? widgets.find((w) => w.id === selectedWidgetId) : null

  const [formData, setFormData] = useState<Partial<WidgetPosition>>(
    selectedWidget || {
      name: '',
      type: 'bar',
      datasetId: null,
      config: {},
    }
  )

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
                onValueChange={(v) => handleChange('datasetId', parseInt(v))}
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

        {/* X-Axis (for charts) */}
        {['bar', 'line', 'scatter'].includes(formData.type as string) && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="xAxis">X-Axis Column</FieldLabel>
              <Input
                id="xAxis"
                value={formData.config?.xAxis || ''}
                onChange={(e) => handleConfigChange('xAxis', e.target.value)}
                placeholder="e.g., date, region"
                className="bg-background border-input"
              />
            </Field>
          </FieldGroup>
        )}

        {/* Y-Axis (for charts) */}
        {['bar', 'line', 'scatter'].includes(formData.type as string) && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="yAxis">Y-Axis Column</FieldLabel>
              <Input
                id="yAxis"
                value={formData.config?.yAxis || ''}
                onChange={(e) => handleConfigChange('yAxis', e.target.value)}
                placeholder="e.g., sales, revenue"
                className="bg-background border-input"
              />
            </Field>
          </FieldGroup>
        )}

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

        {/* Colors */}
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="bgColor">Background Color</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="bgColor"
                type="color"
                value={formData.config?.backgroundColor || '#ffffff'}
                onChange={(e) => handleConfigChange('backgroundColor', e.target.value)}
                className="h-10 w-20 cursor-pointer"
              />
              <Input
                value={formData.config?.backgroundColor || '#ffffff'}
                readOnly
                className="bg-background border-input flex-1"
              />
            </div>
          </Field>
        </FieldGroup>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Save Changes
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
