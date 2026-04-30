'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { apiGet } from '@/lib/api'
import { parseListResponse } from '@/lib/list-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { Plus, Cable } from 'lucide-react'
import { toast } from 'sonner'

interface APIConnection {
  id: number
  name: string
  connection_type: string
  is_active: boolean
  created_at: string
}

function stableDateTimeLabel(iso: string): string {
  if (!iso) return 'N/A'
  // Stable format to avoid SSR/client locale mismatches.
  return iso.replace('T', ' ').slice(0, 19)
}

export default function ConnectionsPage() {
  const { accessToken } = useAuth()
  const [connections, setConnections] = useState<APIConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      setConnections([])
      return
    }
    setIsLoading(true)
    try {
      const data = await apiGet('/api/connections/', accessToken)
      setConnections(parseListResponse<APIConnection>(data))
    } catch (error) {
      console.error('Failed to fetch connections:', error)
      toast.error('Could not load connections')
      setConnections([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-8">
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                Data connections
              </h1>
              <p className="text-muted-foreground">
                Databases, APIs, and other external sources (SQL / REST)
              </p>
            </div>
            <Button
              asChild
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/dashboard/connections/new">
                <Plus className="h-4 w-4" />
                New connection
              </Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-lg border border-border bg-card"
              />
            ))}
          </div>
        ) : connections.length === 0 ? (
          <Empty
            icon={Cable}
            title="No connections yet"
            description="Create a connection to access external data alongside file uploads"
            action={
              <Button asChild className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/dashboard/connections/new">
                  <Plus className="h-4 w-4" />
                  New connection
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {connections.map((connection) => (
              <Card key={connection.id} className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{connection.name}</CardTitle>
                      <CardDescription className="mt-1 uppercase">
                        {connection.connection_type}
                      </CardDescription>
                    </div>
                    <span
                      className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                        connection.is_active ? 'bg-green-500' : 'bg-muted-foreground/50'
                      }`}
                      title={connection.is_active ? 'Active' : 'Inactive'}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Created {stableDateTimeLabel(connection.created_at)}
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
