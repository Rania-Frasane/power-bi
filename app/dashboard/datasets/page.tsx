'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiGet } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { Plus, Upload, Database } from 'lucide-react'
import Link from 'next/link'

interface Dataset {
  id: number
  name: string
  description: string
  source_type: string
  row_count: number
  created_at: string
}

export default function DatasetsPage() {
  const { accessToken } = useAuth()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return

    const fetchDatasets = async () => {
      try {
        const data = await apiGet('/api/datasets/', accessToken)
        setDatasets(data.results || [])
      } catch (error) {
        console.error('Failed to fetch datasets:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDatasets()
  }, [accessToken])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-foreground">Datasets</h1>
            <Link href="/dashboard/upload-dataset">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                <Upload className="w-4 h-4" />
                Upload Data
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground">Manage your data sources and imports</p>
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
        ) : datasets.length === 0 ? (
          <Empty
            icon={Database}
            title="No datasets yet"
            description="Upload or connect to a data source to get started"
            action={
              <Link href="/dashboard/upload-dataset">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Dataset
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datasets.map((dataset) => (
              <Card key={dataset.id} className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="line-clamp-2">{dataset.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {dataset.source_type.toUpperCase()} • {dataset.row_count.toLocaleString()} rows
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {dataset.description || 'No description'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
