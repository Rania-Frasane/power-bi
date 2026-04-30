'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiPost, apiGet } from '@/lib/api'
import { parseListResponse } from '@/lib/list-api'
import { DashboardBuilderProvider, useDashboardBuilder } from '@/lib/dashboard-builder-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { DashboardCanvas } from '@/components/dashboard/builder/canvas'
import { WidgetToolbar } from '@/components/dashboard/builder/widget-toolbar'
import { WidgetConfigurator } from '@/components/dashboard/builder/widget-configurator'
import { toast } from 'sonner'
import { Save, X } from 'lucide-react'

interface Dataset {
  id: number
  name: string
  source_type: string
}

function DashboardBuilderContent() {
  const router = useRouter()
  const { accessToken } = useAuth()
  const { dashboardName, dashboardDescription, widgets, setDashboard } = useDashboardBuilder()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showConfigurator, setShowConfigurator] = useState(false)
  const [name, setName] = useState('Untitled Dashboard')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!accessToken) return

    const fetchDatasets = async () => {
      try {
        const data = await apiGet('/api/datasets/', accessToken)
        setDatasets(parseListResponse<Dataset>(data))
      } catch (error) {
        console.error('Failed to fetch datasets:', error)
        setDatasets([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchDatasets()
  }, [accessToken])

  const handleSaveDashboard = async () => {
    if (!name.trim()) {
      toast.error('Dashboard name is required')
      return
    }

    setIsSaving(true)
    try {
      const dashboardData = {
        name: name.trim(),
        description: description.trim(),
        layout: {
          widgets: widgets.map((w) => ({
            id: w.id,
            x: w.x,
            y: w.y,
            width: w.width,
            height: w.height,
          })),
        },
        theme: 'light',
      }

      const response = await apiPost('/api/dashboards/', dashboardData, accessToken)
      
      // Save widgets
      for (const widget of widgets) {
        await apiPost(
          '/api/widgets/',
          {
            dashboard: response.id,
            dataset: widget.datasetId,
            name: widget.name,
            widget_type: widget.type,
            config: widget.config,
            position_x: widget.x,
            position_y: widget.y,
            width: widget.width,
            height: widget.height,
          },
          accessToken
        )
      }

      toast.success('Dashboard created successfully!')
      router.push(`/dashboard/${response.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save dashboard')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between bg-card">
        <div className="flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dashboard name"
            className="text-lg font-semibold bg-background border-input mb-1"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            className="text-sm bg-background border-input text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-border hover:bg-muted"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSaveDashboard}
            disabled={isSaving || widgets.length === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Dashboard'}
          </Button>
        </div>
      </div>

      {/* Builder */}
      <div className="flex-1 flex gap-4 overflow-hidden p-4">
        {/* Toolbar */}
        <div className="w-64 flex flex-col gap-4 overflow-y-auto">
          <WidgetToolbar datasets={datasets} />
        </div>

        {/* Canvas */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          <div className="flex-1 flex flex-col">
            <DashboardCanvas onWidgetEdit={() => setShowConfigurator(true)} />
          </div>

          {/* Configurator */}
          {showConfigurator && (
            <div className="w-80 overflow-y-auto">
              <WidgetConfigurator
                datasets={datasets}
                onClose={() => setShowConfigurator(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CreateDashboardPage() {
  return (
    <DashboardBuilderProvider>
      <DashboardBuilderContent />
    </DashboardBuilderProvider>
  )
}
