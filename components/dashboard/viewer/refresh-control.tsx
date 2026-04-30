'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RefreshCw, Clock } from 'lucide-react'

interface RefreshControlProps {
  onRefresh: () => Promise<void>
  isLoading?: boolean
}

export function RefreshControl({ onRefresh, isLoading = false }: RefreshControlProps) {
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const DISABLED_VALUE = '__disabled__'

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
      setLastRefreshTime(new Date())
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshInterval) return

    const interval = setInterval(handleRefresh, autoRefreshInterval)
    return () => clearInterval(interval)
  }, [autoRefreshInterval, handleRefresh])

  const getLastRefreshText = () => {
    if (!lastRefreshTime) return 'Never'
    const seconds = Math.floor((Date.now() - lastRefreshTime.getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleRefresh}
        disabled={isRefreshing || isLoading}
        className="border-border hover:bg-muted gap-1"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline text-xs">
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </span>
      </Button>

      <div className="flex items-center gap-1">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{getLastRefreshText()}</span>
      </div>

      <Select
        value={autoRefreshInterval?.toString() || ''}
        onValueChange={(value) => {
          const interval = value === DISABLED_VALUE ? null : value ? parseInt(value) : null
          setAutoRefreshInterval(interval)
        }}
      >
        <SelectTrigger className="w-32 h-9 text-xs bg-background border-input">
          <SelectValue placeholder="Auto-refresh" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          <SelectItem value={DISABLED_VALUE}>Disabled</SelectItem>
          <SelectItem value="5000">Every 5s</SelectItem>
          <SelectItem value="10000">Every 10s</SelectItem>
          <SelectItem value="30000">Every 30s</SelectItem>
          <SelectItem value="60000">Every 1m</SelectItem>
          <SelectItem value="300000">Every 5m</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
