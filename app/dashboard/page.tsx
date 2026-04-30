'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiGet } from '@/lib/api'
import { parseListResponse } from '@/lib/list-api'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/empty'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Plus, BarChart3, Activity } from 'lucide-react'

interface Dashboard {
  id: number
  name: string
  description: string
  widget_count: number
  auto_refresh: boolean
  theme: string
  created_at: string
}

export default function DashboardsPage() {
  const { accessToken } = useAuth()
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return

    const fetchDashboards = async () => {
      try {
        const data = await apiGet('/api/dashboards/', accessToken)
        setDashboards(parseListResponse<Dashboard>(data))
      } catch (error) {
        console.error('Failed to fetch dashboards:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboards()
  }, [accessToken])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-foreground">Dashboards</h1>
            <div className="flex gap-2">
              <Link href="/dashboard/upload-dataset">
                <Button variant="outline" className="border-border hover:bg-muted gap-2">
                  <Plus className="w-4 h-4" />
                  Upload Data
                </Button>
              </Link>
              <Link href="/dashboard/create">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                  <Plus className="w-4 h-4" />
                  New Dashboard
                </Button>
              </Link>
            </div>
          </div>
          <p className="text-muted-foreground">Create and manage your analytics dashboards</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 bg-card border border-border rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : dashboards.length === 0 ? (
          <Empty
            icon={BarChart3}
            title="No dashboards yet"
            description="Create your first dashboard to start visualizing your data"
            action={
              <Link href="/dashboard/create">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                  <Plus className="w-4 h-4" />
                  Create Dashboard
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboards.map((dashboard) => (
              <Card key={dashboard.id} className="h-full hover:border-primary transition-colors bg-card border-border flex flex-col">
                <Link href={`/dashboard/${dashboard.id}`} className="flex-1">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="line-clamp-2">{dashboard.name}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {dashboard.description || 'No description'}
                        </CardDescription>
                      </div>
                      <Activity className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Widgets</span>
                        <span className="font-semibold text-foreground">{dashboard.widget_count}</span>
                      </div>
                      {dashboard.auto_refresh && (
                        <div className="flex items-center gap-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full w-fit">
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                          Auto-refresh enabled
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Created {new Date(dashboard.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Link>
                <div className="border-t border-border p-4 flex gap-2">
                  <Link href={`/dashboard/${dashboard.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full border-border hover:bg-muted">
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/dashboard/${dashboard.id}`} className="flex-1">
                    <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      View
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
