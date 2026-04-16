'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiGet } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { Plus, Cable } from 'lucide-react'

interface APIConnection {
  id: number
  name: string
  connection_type: string
  is_active: boolean
  created_at: string
}

export default function ConnectionsPage() {
  const { accessToken } = useAuth()
  const [connections, setConnections] = useState<APIConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return

    const fetchConnections = async () => {
      try {
        const data = await apiGet('/api/connections/', accessToken)
        setConnections(data.results || [])
      } catch (error) {
        console.error('Failed to fetch connections:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConnections()
  }, [accessToken])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-foreground">Data Connections</h1>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
              <Plus className="w-4 h-4" />
              New Connection
            </Button>
          </div>
          <p className="text-muted-foreground">Connect to databases, APIs, and other data sources</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-32 bg-card border border-border rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : connections.length === 0 ? (
          <Empty
            icon={Cable}
            title="No connections yet"
            description="Create a connection to start accessing external data sources"
            action={
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                <Plus className="w-4 h-4" />
                New Connection
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {connections.map((connection) => (
              <Card key={connection.id} className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{connection.name}</CardTitle>
                      <CardDescription>{connection.connection_type}</CardDescription>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        connection.is_active ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                    />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
