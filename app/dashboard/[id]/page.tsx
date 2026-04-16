'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiGet } from '@/lib/api'
import { DashboardViewerProvider, useDashboardViewer } from '@/lib/dashboard-viewer-context'
import { WidgetRenderer } from '@/components/dashboard/viewer/widget-renderer'
import { FilterBar, FilterValue } from '@/components/dashboard/viewer/filter-bar'
import { RefreshControl } from '@/components/dashboard/viewer/refresh-control'
import { ExportModal } from '@/components/dashboard/export-modal'
import { SharingDialog } from '@/components/dashboard/sharing-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { ArrowLeft, Settings, Share2, Download } from 'lucide-react'
import Link from 'next/link'

interface Widget {
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

interface DashboardData {
  id: number
  name: string
  description: string
  layout: any
  theme: string
  widgets: Widget[]
}

interface DatasetData {
  id: number
  name: string
  data: any[]
}

function DashboardViewerContent() {
  const router = useRouter()
  const params = useParams()
  const dashboardId = params.id as string
  const { accessToken } = useAuth()
  const { setWidgetData, setWidgetLoading, getFilteredData, updateFilter } = useDashboardViewer()

  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [datasets, setDatasets] = useState<Record<number, any[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<FilterValue[]>([])
  const [showExportModal, setShowExportModal] = useState(false)
  const [showSharingDialog, setShowSharingDialog] = useState(false)

  useEffect(() => {
    if (!accessToken || !dashboardId) return

    const fetchDashboard = async () => {
      try {
        const dashboardRes = await apiGet(`/api/dashboards/${dashboardId}/`, accessToken)
        setDashboard(dashboardRes)

        // Load data for all datasets
        const datasetMap: Record<number, any[]> = {}

        if (dashboardRes.widgets) {
          const uniqueDatasets = [...new Set(dashboardRes.widgets.map((w: Widget) => w.dataset))]

          for (const datasetId of uniqueDatasets) {
            if (datasetId) {
              try {
                setWidgetLoading(datasetId, true)
                const dataRes = await apiGet(
                  `/api/datasets/${datasetId}/data/`,
                  accessToken
                )
                datasetMap[datasetId] = dataRes.data || []
                setWidgetData(datasetId, dataRes.data || [])
              } catch (error) {
                console.error(`Failed to fetch dataset ${datasetId}:`, error)
                datasetMap[datasetId] = []
              } finally {
                setWidgetLoading(datasetId, false)
              }
            }
          }
        }

        setDatasets(datasetMap)

        // Auto-detect filter columns
        const autoFilters: FilterValue[] = []
        if (dashboardRes.widgets && dashboardRes.widgets.length > 0) {
          const firstWidget = dashboardRes.widgets[0]
          const firstDatasetId = firstWidget.dataset
          const firstDataset = datasetMap[firstDatasetId]

          if (firstDataset && firstDataset.length > 0) {
            const columns = Object.keys(firstDataset[0])
            // Add first categorical column as filter
            if (columns.length > 0) {
              autoFilters.push({
                id: `filter-${columns[0]}`,
                name: columns[0],
                type: 'text',
                value: null,
                column: columns[0],
              })
            }
          }
        }
        setFilters(autoFilters)
      } catch (error) {
        toast.error('Failed to load dashboard')
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [accessToken, dashboardId, setWidgetData, setWidgetLoading, router])

  const handleFilterChange = (filterId: string, value: string | number | null) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === filterId ? { ...f, value } : f))
    )
    updateFilter(filterId, value)
  }

  const handleFilterRemove = (filterId: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== filterId))
  }

  const handleRefresh = async () => {
    if (!accessToken || !dashboardId) return

    try {
      const dashboardRes = await apiGet(`/api/dashboards/${dashboardId}/`, accessToken)

      // Refresh all dataset data
      if (dashboardRes.widgets) {
        const uniqueDatasets = [...new Set(dashboardRes.widgets.map((w: Widget) => w.dataset))]

        for (const datasetId of uniqueDatasets) {
          if (datasetId) {
            try {
              setWidgetLoading(datasetId, true)
              const dataRes = await apiGet(`/api/datasets/${datasetId}/data/`, accessToken)
              setWidgetData(datasetId, dataRes.data || [])
            } catch (error) {
              console.error(`Failed to refresh dataset ${datasetId}:`, error)
            } finally {
              setWidgetLoading(datasetId, false)
            }
          }
        }
      }
      toast.success('Dashboard refreshed')
    } catch (error) {
      toast.error('Failed to refresh dashboard')
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
      <div className="border-b border-border p-4 bg-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full hover:bg-muted"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{dashboard.name}</h1>
              {dashboard.description && (
                <p className="text-sm text-muted-foreground">{dashboard.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RefreshControl onRefresh={handleRefresh} isLoading={isLoading} />
            <Button
              onClick={() => setShowExportModal(true)}
              variant="outline"
              size="sm"
              className="border-border hover:bg-muted gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              onClick={() => setShowSharingDialog(true)}
              variant="outline"
              size="sm"
              className="border-border hover:bg-muted gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Link href={`/dashboard/${dashboard.id}/edit`}>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                <Settings className="w-4 h-4" />
                Edit
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Filters */}
        {filters.length > 0 && (
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onFilterRemove={handleFilterRemove}
          />
        )}

        {/* Widgets Grid */}
        {dashboard.widgets && dashboard.widgets.length > 0 ? (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            }}
          >
            {dashboard.widgets.map((widget) => {
              const datasetId = widget.dataset
              const rawData = datasets[datasetId] || []
              const filteredData = getFilteredData(rawData, datasetId)

              return (
                <div key={widget.id} className="h-96">
                  <WidgetRenderer
                    widget={{
                      id: `widget-${widget.id}`,
                      x: widget.position_x,
                      y: widget.position_y,
                      width: widget.width,
                      height: widget.height,
                      type: widget.widget_type as any,
                      name: widget.name,
                      datasetId,
                      config: widget.config || {},
                    }}
                    data={filteredData}
                    isLoading={false}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <Card className="flex items-center justify-center h-64 bg-card border-border">
            <p className="text-muted-foreground">No widgets in this dashboard</p>
          </Card>
        )}

        {/* Export Modal */}
        <ExportModal
          dashboardName={dashboard.name}
          data={datasets}
          onClose={() => setShowExportModal(false)}
          isOpen={showExportModal}
        />

        {/* Sharing Dialog */}
        <SharingDialog
          dashboardId={dashboard.id}
          dashboardName={dashboard.name}
          isOpen={showSharingDialog}
          onClose={() => setShowSharingDialog(false)}
        />
      </div>
    </div>
  )
}

export default function DashboardViewPage() {
  return (
    <DashboardViewerProvider>
      <DashboardViewerContent />
    </DashboardViewerProvider>
  )
}
