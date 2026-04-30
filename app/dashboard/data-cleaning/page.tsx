'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiGet } from '@/lib/api'
import { parseListResponse } from '@/lib/list-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

type DatasetListItem = {
  id: number
  name: string
  source_type: string
}

type CleaningOptions = {
  trimStrings: boolean
  dropEmptyRows: boolean
  dropDuplicates: boolean
}

type CleaningReport = {
  row_count: number
  duplicate_row_count: number
  corrupted_cells: number
  outlier_cells: number
  fixed_cells: number
  fixed_by_column?: Record<string, number>
  corrupted_by_column?: Record<string, number>
  outliers_by_column?: Record<string, number>
  outlier_z?: number
  max_rows?: number
  warning?: string
}

const NONE_VALUE = '__none__'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const cols = Object.keys(rows[0])
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const header = cols.map(esc).join(',')
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(',')).join('\n')
  return `${header}\n${body}`
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function applyCleaning(rows: Record<string, unknown>[], options: CleaningOptions) {
  let out = rows
  if (options.trimStrings) {
    out = out.map((r) => {
      const next: Record<string, unknown> = { ...r }
      for (const k of Object.keys(next)) {
        const v = next[k]
        if (typeof v === 'string') next[k] = v.trim()
      }
      return next
    })
  }
  if (options.dropEmptyRows) {
    out = out.filter((r) =>
      Object.values(r).some((v) => v !== null && v !== undefined && String(v).trim() !== ''),
    )
  }
  if (options.dropDuplicates) {
    const seen = new Set<string>()
    out = out.filter((r) => {
      const key = JSON.stringify(r)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  return out
}

export default function DataCleaningPage() {
  const { accessToken } = useAuth()
  const [datasets, setDatasets] = useState<DatasetListItem[]>([])
  const [datasetId, setDatasetId] = useState<string>(NONE_VALUE)
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([])
  const [serverRows, setServerRows] = useState<Record<string, unknown>[]>([])
  const [serverReport, setServerReport] = useState<CleaningReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [useServerCleaning, setUseServerCleaning] = useState(true)
  const [options, setOptions] = useState<CleaningOptions>({
    trimStrings: true,
    dropEmptyRows: true,
    dropDuplicates: false,
  })

  const loadDatasets = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await apiGet('/api/datasets/', accessToken)
      setDatasets(parseListResponse<DatasetListItem>(res))
    } catch {
      setDatasets([])
    }
  }, [accessToken])

  useEffect(() => {
    void loadDatasets()
  }, [loadDatasets])

  const selected = useMemo(
    () => datasets.find((d) => String(d.id) === datasetId),
    [datasets, datasetId],
  )

  const loadRows = useCallback(async () => {
    if (!accessToken) return
    if (datasetId === NONE_VALUE) return
    setLoading(true)
    try {
      const res = await apiGet(`/api/datasets/${datasetId}/data/?limit=2000`, accessToken)
      setRawRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      setRawRows([])
      toast.error(e instanceof Error ? e.message : 'Failed to load dataset')
    } finally {
      setLoading(false)
    }
  }, [accessToken, datasetId])

  const loadServerPreview = useCallback(async () => {
    if (!accessToken) return
    if (datasetId === NONE_VALUE) return
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', '50')
      qs.set('trim_strings', options.trimStrings ? '1' : '0')
      qs.set('drop_duplicates', options.dropDuplicates ? '1' : '0')
      // dropEmptyRows is client-only for now (server keeps row shape unless duplicates/outliers/corruption)
      const res = await apiGet(`/api/datasets/${datasetId}/cleaning/preview/?${qs.toString()}`, accessToken)
      setServerRows(Array.isArray(res.data) ? res.data : [])
      setServerReport(res.report || null)
    } catch (e) {
      setServerRows([])
      setServerReport(null)
      toast.error(e instanceof Error ? e.message : 'Failed to load cleaning preview')
    } finally {
      setLoading(false)
    }
  }, [accessToken, datasetId, options.dropDuplicates, options.trimStrings])

  useEffect(() => {
    if (useServerCleaning) {
      void loadServerPreview()
    } else {
      void loadRows()
    }
  }, [loadRows, loadServerPreview, useServerCleaning])

  const clientCleanedRows = useMemo(() => applyCleaning(rawRows, options), [rawRows, options])
  const cleanedRows = useMemo(() => {
    if (useServerCleaning) {
      // Apply client-only options (dropEmptyRows) on top of server output
      return applyCleaning(serverRows, { ...options, dropDuplicates: false })
    }
    return clientCleanedRows
  }, [clientCleanedRows, options, serverRows, useServerCleaning])
  const columns = useMemo(() => (cleanedRows[0] ? Object.keys(cleanedRows[0]) : []), [cleanedRows])

  const filteredPreview = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = cleanedRows
    if (!q) return base.slice(0, 30)
    return base
      .filter((r) => columns.some((c) => String(r[c] ?? '').toLowerCase().includes(q)))
      .slice(0, 30)
  }, [cleanedRows, columns, search])

  const metrics = useMemo(() => {
    const baseRawCount = useServerCleaning ? (serverReport?.row_count ?? 0) : rawRows.length
    const rawCount = baseRawCount
    if (rawCount === 0) return null
    const cleanedCount = cleanedRows.length
    const removed = rawCount - cleanedCount
    const missingByCol = columns.map((c) => {
      let missing = 0
      for (const r of cleanedRows) {
        const v = r[c]
        if (v === null || v === undefined || String(v).trim() === '') missing += 1
      }
      return { col: c, missingPct: cleanedRows.length ? (missing / cleanedRows.length) * 100 : 0 }
    })
    return { rawCount, cleanedCount, removed, missingByCol }
  }, [cleanedRows, columns, rawRows.length, serverReport?.row_count, useServerCleaning])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Data cleaning</h1>
          <p className="text-sm text-muted-foreground">
            Automatically detect duplicates and corrupted / inconsistent values. The server will
            interpolate numeric anomalies using previous/next values (expected value), then you
            can preview and export.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="border-border bg-card lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Dataset</CardTitle>
              <CardDescription>Select a dataset to clean</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={datasetId} onValueChange={setDatasetId}>
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Pick a dataset" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value={NONE_VALUE}>Select…</SelectItem>
                  {datasets.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name} (#{d.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
                <p className="text-muted-foreground text-xs">Options</p>
                <label className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useServerCleaning}
                    onChange={(e) => setUseServerCleaning(e.target.checked)}
                  />
                  <span>Use server auto-detection (recommended)</span>
                </label>
                <label className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.trimStrings}
                    onChange={(e) => setOptions((o) => ({ ...o, trimStrings: e.target.checked }))}
                  />
                  <span>Trim strings</span>
                </label>
                <label className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.dropEmptyRows}
                    onChange={(e) => setOptions((o) => ({ ...o, dropEmptyRows: e.target.checked }))}
                  />
                  <span>Drop empty rows</span>
                </label>
                <label className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.dropDuplicates}
                    onChange={(e) => setOptions((o) => ({ ...o, dropDuplicates: e.target.checked }))}
                  />
                  <span>Drop duplicates</span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={datasetId === NONE_VALUE || loading}
                  onClick={() => void (useServerCleaning ? loadServerPreview() : loadRows())}
                >
                  {loading ? 'Loading…' : 'Reload'}
                </Button>
                <Button
                  type="button"
                  disabled={cleanedRows.length === 0}
                  onClick={async () => {
                    const name = selected?.name?.replace(/[^a-z0-9-_]+/gi, '-') || 'dataset'
                    if (!useServerCleaning) {
                      downloadText(`${name}-cleaned.csv`, toCsv(cleanedRows), 'text/csv;charset=utf-8')
                      toast.success('Cleaned CSV downloaded')
                      return
                    }
                    try {
                      if (!accessToken || datasetId === NONE_VALUE) return
                      const qs = new URLSearchParams()
                      qs.set('trim_strings', options.trimStrings ? '1' : '0')
                      qs.set('drop_duplicates', options.dropDuplicates ? '1' : '0')
                      const url = `${API_BASE_URL}/api/datasets/${datasetId}/cleaning/export/?${qs.toString()}`
                      const resp = await fetch(url, {
                        method: 'GET',
                        headers: { Authorization: `Bearer ${accessToken}` },
                      })
                      if (!resp.ok) throw new Error(`API Error: ${resp.status}`)
                      const blob = await resp.blob()
                      const dlUrl = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = dlUrl
                      a.download = `${name}-cleaned.csv`
                      a.rel = 'noopener'
                      document.body.appendChild(a)
                      a.click()
                      a.remove()
                      URL.revokeObjectURL(dlUrl)
                      toast.success('Cleaned CSV downloaded')
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Failed to export cleaned CSV')
                    }
                  }}
                >
                  Download CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>
                {datasetId === NONE_VALUE ? 'Pick a dataset to preview cleaning.' : 'First 30 rows (filtered).'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search preview..."
                  className="bg-background border-input"
                />
                {metrics ? (
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    Raw {metrics.rawCount} → Clean {metrics.cleanedCount} (removed {metrics.removed})
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground whitespace-nowrap">—</p>
                )}
              </div>

              {metrics?.missingByCol?.length ? (
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-xs font-semibold text-foreground mb-2">Missing values (cleaned)</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {metrics.missingByCol.slice(0, 8).map((m) => (
                      <p key={m.col} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{m.col}</span>: {m.missingPct.toFixed(1)}%
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              {useServerCleaning && serverReport ? (
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-xs font-semibold text-foreground mb-2">Auto-detection report</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Duplicates</span>: {serverReport.duplicate_row_count}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Corrupted cells</span>: {serverReport.corrupted_cells}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Outlier cells</span>: {serverReport.outlier_cells}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Fixed cells</span>: {serverReport.fixed_cells}
                    </p>
                  </div>
                </div>
              ) : null}

              {filteredPreview.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">
                  No rows to preview.
                </p>
              ) : (
                <div className="overflow-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.slice(0, 8).map((c) => (
                          <TableHead key={c}>{c}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPreview.map((row, idx) => (
                        <TableRow key={idx}>
                          {columns.slice(0, 8).map((c) => (
                            <TableCell key={c} className="max-w-[220px] truncate">
                              {String(row[c] ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

