'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchDatasetById } from '@/lib/api/datasets'

export type DatasetConfig = {
  datasetId: string | number | null
  columnMapping: {
    x?: string
    y?: string
    label?: string
    value?: string
    columns?: string[]
  }
}

export type UseDatasetReturn = {
  data: Record<string, unknown>[]
  columns: string[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  refetch: () => void
}

const sharedCache = new Map<string, Record<string, unknown>[]>()

export function useDataset(config: DatasetConfig | null): UseDatasetReturn {
  const datasetId = config?.datasetId
  const cacheRef = useRef(sharedCache)
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  )
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const cacheKey = useMemo(
    () => (datasetId === null || datasetId === undefined ? '' : String(datasetId)),
    [datasetId],
  )

  const load = useCallback(async () => {
    if (!cacheKey) {
      setStatus('idle')
      setData([])
      setError(null)
      return
    }

    const cached = cacheRef.current.get(cacheKey)
    if (cached) {
      setData(cached)
      setStatus('ready')
      setError(null)
      return
    }

    setStatus('loading')
    setError(null)
    try {
      const rows = await fetchDatasetById(cacheKey)
      cacheRef.current.set(cacheKey, rows)
      setData(rows)
      setStatus('ready')
    } catch (e) {
      setStatus('error')
      setData([])
      setError(e instanceof Error ? e.message : 'Failed to load dataset')
    }
  }, [cacheKey])

  useEffect(() => {
    void load()
  }, [load, nonce])

  const columns = useMemo(() => (data.length > 0 ? Object.keys(data[0]) : []), [data])

  const refetch = useCallback(() => {
    if (cacheKey) {
      cacheRef.current.delete(cacheKey)
    }
    setNonce((n) => n + 1)
  }, [cacheKey])

  return { data, columns, status, error, refetch }
}
