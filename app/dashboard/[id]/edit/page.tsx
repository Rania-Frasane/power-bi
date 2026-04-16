'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiPost, apiGet, apiPut } from '@/lib/api'
import { DashboardBuilderProvider, useDashboardBuilder } from '@/lib/dashboard-builder-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { DashboardCanvas } from '@/components/dashboard/builder/canvas'
import { WidgetToolbar } from '@/components/dashboard/builder/widget-toolbar'
import { WidgetConfigurator } from '@/components/dashboard/builder/widget-configurator'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { Save, X } from 'lucide-react'

interface Dataset {
  id: number
  name: string
  source_type: string
}

interface DashboardData {
  id: number
  name: string
  description: string
  layout: any
  theme: string
}

interface WidgetData {
  id: number
  name: string
  widget_type: string
  dataset: number
  config: any
  position_x: number
  position_y: number
  width: number
  height: number
}

function DashboardEditContent() {
  const router = useRouter()
  const params = useParams()
  const dashboardId = params.id as string
  const { accessToken } = useAuth()
  const { widgets, setDashboard, addWidget } = useDashboardBuilder()
  
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [dashboard, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showConfigurator, setShowConfigurator] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!accessToken || !dashboardId) return

    const fetchData = async () => {
      try {
        const [dashboardRes, datasetsRes] = await Promise.all([
          apiGet(`/api/dashboards/${dashboardId}/`, accessToken),
          apiGet('/api/datasets/', accessToken),
        ])

        setDashboardData(dashboardRes)
        setName(dashboardRes.name)
        setDescription(dashboardRes.description)
        setDatasets(datasetsRes.results || [])
        
        setDashboard(dashboardRes.id, dashboardRes.name, dashboardRes.description)

        // Load widgets
        if (dashboardRes.widgets && dashboardRes.widgets.length > 0) {
          dashboardRes.widgets.forEach((w: WidgetData) => {
            addWidget({
              id: `widget-${w.id}`,
              x: w.position_x,
              y: w.position_y,
              width: w.width,
              height: w.height,
              type: w.widget_type as any,
              name: w.name,
              datasetId: w.dataset,
              config: w.config || {},
            })
          })
        }
      } catch (error) {
        toast.error('Failed to load dashboard')
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [accessToken, dashboardId, setDashboard, addWidget, router])

  const handleSaveDashboard = async () => {
    if (!name.trim()) {
      toast.error('Dashboard name is required')
      return
    }

    setIsSaving(true)
    try {
      // Update dashboard metadata
      await apiPut(
        `/api/dashboards/${dashboardId}/`,
        {
          name: name.trim(),
          description: description.trim(),
          theme: 'light',
        },
        accessToken
      )

      // TODO: Update widgets - would need to sync widget changes
      
      toast.success('Dashboard updated successfully!')
      router.push(`/dashboard/${dashboardId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save dashboard')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="text-primary" />
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Dashboard not found</p>
      </div>
    )
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
            disabled={isSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
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

export default function EditDashboardPage() {
  return (
    <DashboardBuilderProvider>
      <DashboardEditContent />
    </DashboardBuilderProvider>
  )
}
