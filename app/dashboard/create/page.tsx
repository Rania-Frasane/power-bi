'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiPost, apiGet } from '@/lib/api'
import { parseListResponse } from '@/lib/list-api'
import { DashboardBuilderProvider, useDashboardBuilder } from '@/lib/dashboard-builder-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DashboardCanvas } from '@/components/dashboard/builder/canvas'
import { WidgetToolbar } from '@/components/dashboard/builder/widget-toolbar'
import { WidgetConfigurator } from '@/components/dashboard/builder/widget-configurator'
import { toast } from 'sonner'
import { LayoutDashboard, Save, Sparkles, X } from 'lucide-react'

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
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="border-b border-border/80 bg-card/80 px-6 py-4 backdrop-blur">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <LayoutDashboard className="h-4 w-4" />
          <span>Analytics Dashboard Builder</span>
          <Sparkles className="ml-1 h-3.5 w-3.5" />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dashboard name"
              className="h-11 border-input bg-background text-lg font-semibold"
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a short description..."
              className="h-10 border-input bg-background text-sm text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="border-border hover:bg-muted"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveDashboard}
              disabled={isSaving || widgets.length === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Dashboard'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden p-4 md:p-6">
        <div className="w-72 shrink-0 overflow-y-auto">
          <WidgetToolbar datasets={datasets} />
        </div>

        <div className="flex min-w-0 flex-1 gap-4 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col">
            <DashboardCanvas onWidgetEdit={() => setShowConfigurator(true)} />
          </div>

          {showConfigurator && (
            <div className="w-96 max-w-[40vw] overflow-y-auto">
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
