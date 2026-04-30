'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'
import {
  type AnalysisChartSpec,
  type DatasetAnalysis,
  isDatasetAnalysis,
} from '@/lib/dataset-analysis-types'
import { apiGet } from '@/lib/api'
import {
  DATASET_TABLE_REF,
  fetchDatasetTablePage,
} from '@/lib/dataset-table-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const PIE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function formatTableCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

const TABLE_PAGE_SIZE = 8
const SEARCH_DEBOUNCE_MS = 400

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

function rowMatchesSearch(
  row: Record<string, unknown>,
  columnKeys: string[],
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return columnKeys.some((key) => formatTableCell(row[key]).toLowerCase().includes(q))
}

function SpecTableChartEmbedded({
  data,
  columnKeys,
  title,
}: {
  data: Record<string, unknown>[]
  columnKeys: string[]
  title?: string
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    return data.filter((row) => rowMatchesSearch(row, columnKeys, search))
  }, [data, columnKeys, search])

  useEffect(() => {
    setPage(1)
  }, [search, data])

  const totalPages = Math.max(1, Math.ceil(filtered.length / TABLE_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * TABLE_PAGE_SIZE
  const pageRows = filtered.slice(start, start + TABLE_PAGE_SIZE)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  return (
    <div className="w-full min-w-0 space-y-3">
      {title ? (
        <p className="text-sm font-medium text-foreground truncate" title={title}>
          {title}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          placeholder="Search in displayed columns…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md bg-background border-input text-sm"
          aria-label="Filter table rows"
        />
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          {filtered.length === 0
            ? search.trim()
              ? 'No matching rows'
              : 'No rows'
            : `${filtered.length} row${filtered.length === 1 ? '' : 's'}`}
          {search.trim() && data.length !== filtered.length
            ? ` · ${data.length} total`
            : null}
        </p>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {search.trim() ? 'Try a different search term.' : 'No data to show.'}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columnKeys.map((key) => (
                <TableHead key={key} className="max-w-[220px] truncate" title={key}>
                  {key}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row, rowIndex) => (
              <TableRow key={`${currentPage}-${start + rowIndex}`}>
                {columnKeys.map((key) => {
                  const raw = row[key]
                  const text = formatTableCell(raw)
                  return (
                    <TableCell
                      key={key}
                      className="max-w-[220px] truncate font-mono text-xs"
                      title={text}
                    >
                      {text}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {filtered.length > TABLE_PAGE_SIZE ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
            <span className="mx-1.5 text-border">·</span>
            Rows {start + 1}–{start + pageRows.length} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SpecTableChartServer({
  datasetId,
  accessToken,
  title,
  hintColumnKeys,
}: {
  datasetId: number
  accessToken: string
  title?: string
  hintColumnKeys: string[]
}) {
  const [qInput, setQInput] = useState('')
  const debouncedQ = useDebouncedValue(qInput, SEARCH_DEBOUNCE_MS)
  const [sortCol, setSortCol] = useState('')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [columnKeys, setColumnKeys] = useState<string[]>(hintColumnKeys)
  const [total, setTotal] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const prevFilters = useRef({ q: debouncedQ, sortCol, order })

  useEffect(() => {
    let cancelled = false
    const filtersChanged =
      prevFilters.current.q !== debouncedQ ||
      prevFilters.current.sortCol !== sortCol ||
      prevFilters.current.order !== order

    if (filtersChanged) {
      prevFilters.current = { q: debouncedQ, sortCol, order }
      setPage(1)
      if (page !== 1) {
        return
      }
    }

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchDatasetTablePage(datasetId, accessToken, {
          page,
          page_size: TABLE_PAGE_SIZE,
          q: debouncedQ || undefined,
          sort: sortCol || undefined,
          order,
        })
        if (cancelled) return
        setRows(Array.isArray(res.rows) ? res.rows : [])
        setColumnKeys(
          Array.isArray(res.columnKeys) && res.columnKeys.length > 0
            ? res.columnKeys
            : hintColumnKeys,
        )
        setTotal(typeof res.total === 'number' ? res.total : 0)
        const pc =
          typeof res.page_count === 'number'
            ? res.page_count
            : Math.max(1, Math.ceil((res.total ?? 0) / TABLE_PAGE_SIZE))
        setPageCount(pc)
        if (page > pc) setPage(pc)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load table')
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [datasetId, accessToken, page, debouncedQ, sortCol, order, hintColumnKeys])

  const sortableKeys = columnKeys.length > 0 ? columnKeys : hintColumnKeys
  const start = total === 0 ? 0 : (page - 1) * TABLE_PAGE_SIZE + 1
  const end = total === 0 ? 0 : (page - 1) * TABLE_PAGE_SIZE + rows.length
  const showPager = total > TABLE_PAGE_SIZE || pageCount > 1

  return (
    <div className="w-full min-w-0 space-y-3">
      {title ? (
        <p className="text-sm font-medium text-foreground truncate" title={title}>
          {title}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">Server-side table (full file)</p>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <Input
          type="search"
          placeholder="Search all columns…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          className="max-w-md flex-1 bg-background border-input text-sm"
          aria-label="Search table (server)"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="whitespace-nowrap">Sort by</span>
            <select
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
              value={sortCol}
              onChange={(e) => setSortCol(e.target.value)}
              aria-label="Sort column"
            >
              <option value="">None</option>
              {sortableKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!sortCol}
            onClick={() => setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
          >
            Order: {order.toUpperCase()}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground lg:ml-auto">
          {total.toLocaleString()} row{total === 1 ? '' : 's'} total
        </p>
      </div>
      {error ? (
        <p className="text-sm text-destructive py-2">{error}</p>
      ) : null}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Spinner className="h-5 w-5" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {debouncedQ.trim()
            ? 'No matching rows (server).'
            : 'No rows in this dataset.'}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columnKeys.map((key) => (
                <TableHead key={key} className="max-w-[220px] truncate" title={key}>
                  {key}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={`${page}-${rowIndex}`}>
                {columnKeys.map((key) => {
                  const raw = row[key]
                  const text = formatTableCell(raw)
                  return (
                    <TableCell
                      key={key}
                      className="max-w-[220px] truncate font-mono text-xs"
                      title={text}
                    >
                      {text}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {!loading && !error && showPager ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {pageCount}
            <span className="mx-1.5 text-border">·</span>
            Rows {start}–{end} of {total.toLocaleString()}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SpecTableChart(props: {
  data: Record<string, unknown>[]
  columnKeys: string[]
  title?: string
  tableRef?: string
  datasetId?: number
  accessToken?: string
}) {
  const useServer =
    props.tableRef === DATASET_TABLE_REF &&
    props.datasetId != null &&
    Boolean(props.accessToken?.trim())

  if (useServer) {
    return (
      <SpecTableChartServer
        datasetId={props.datasetId!}
        accessToken={props.accessToken!}
        title={props.title}
        hintColumnKeys={props.columnKeys}
      />
    )
  }

  return (
    <SpecTableChartEmbedded
      data={props.data}
      columnKeys={props.columnKeys}
      title={props.title}
    />
  )
}

export type ChartRemoteContext = {
  datasetId?: number
  accessToken?: string
}

function SpecChart({
  spec,
  chartRemoteContext,
}: {
  spec: AnalysisChartSpec
  chartRemoteContext?: ChartRemoteContext
}) {
  const { type, data, mapping, title } = spec
  const height = 260

  const isRemoteTable =
    type === 'table' &&
    mapping.tableRef === DATASET_TABLE_REF &&
    chartRemoteContext?.datasetId != null &&
    Boolean(chartRemoteContext.accessToken?.trim())

  if (!isRemoteTable && (!Array.isArray(data) || data.length === 0)) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No rows for this chart.
      </p>
    )
  }

  if (type === 'line') {
    const xKey = mapping.xKey
    const yKey = mapping.yKey
    if (!xKey || !yKey) {
      return <p className="text-sm text-destructive">Invalid line chart mapping.</p>
    }
    return (
      <div className="w-full min-h-[260px]">
        {title ? (
          <p className="text-sm font-medium text-foreground mb-2 truncate" title={title}>
            {title}
          </p>
        ) : null}
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} width={40} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 2, fill: 'var(--chart-1)' }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (type === 'bar') {
    const xKey = mapping.xKey
    const yKey = mapping.yKey
    if (!xKey || !yKey) {
      return <p className="text-sm text-destructive">Invalid bar chart mapping.</p>
    }
    return (
      <div className="w-full min-h-[260px]">
        {title ? (
          <p className="text-sm font-medium text-foreground mb-2 truncate" title={title}>
            {title}
          </p>
        ) : null}
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={56} />
            <YAxis tick={{ fontSize: 10 }} width={40} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey={yKey} fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (type === 'table') {
    const columnKeys = mapping.columnKeys
    if (!Array.isArray(columnKeys) || columnKeys.length === 0) {
      return (
        <p className="text-sm text-destructive">
          Invalid table chart mapping (columnKeys required).
        </p>
      )
    }
    return (
      <SpecTableChart
        data={data}
        columnKeys={columnKeys}
        title={title}
        tableRef={mapping.tableRef}
        datasetId={chartRemoteContext?.datasetId}
        accessToken={chartRemoteContext?.accessToken}
      />
    )
  }

  if (type === 'pie') {
    const nameKey = mapping.nameKey
    const valueKey = mapping.valueKey
    if (!nameKey || !valueKey) {
      return <p className="text-sm text-destructive">Invalid pie chart mapping.</p>
    }
    return (
      <div className="w-full min-h-[260px]">
        {title ? (
          <p className="text-sm font-medium text-foreground mb-2 truncate" title={title}>
            {title}
          </p>
        ) : null}
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={88}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <p className="text-sm text-muted-foreground py-6 text-center">
      Unsupported chart type: <span className="font-mono">{type}</span>
    </p>
  )
}

export type AutoInsightsPanelProps = {
  analysis: DatasetAnalysis | null | undefined
  isLoading?: boolean
  title?: string
  description?: string
  className?: string
  emptyMessage?: string
  /** When set with accessToken, table charts with tableRef=dataset use the server table API. */
  datasetId?: number
  accessToken?: string
}

export function AutoInsightsPanel({
  analysis,
  isLoading = false,
  title = 'Auto insights',
  description = 'Generated from your dataset profile and heuristics.',
  className,
  emptyMessage = 'No analysis yet. Upload a file or refresh the dataset.',
  datasetId,
  accessToken,
}: AutoInsightsPanelProps) {
  const charts = analysis?.charts ?? []
  const insights = analysis?.insights ?? []
  const metrics = analysis?.metrics
  const hasBody = charts.length > 0 || insights.length > 0 || (metrics && Object.keys(metrics).length > 0)

  const chartRemoteContext: ChartRemoteContext | undefined =
    datasetId != null && accessToken
      ? { datasetId, accessToken }
      : undefined

  if (isLoading) {
    return (
      <Card className={cn('bg-card border-border', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Spinner className="h-5 w-5" />
          <span className="text-sm">Loading analysis…</span>
        </CardContent>
      </Card>
    )
  }

  if (!analysis || !hasBody) {
    return (
      <Card className={cn('bg-card border-border', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('bg-card border-border', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {metrics && typeof metrics.rowCount === 'number' ? (
          <p className="text-xs text-muted-foreground pt-1">
            {metrics.rowCount.toLocaleString()} rows
            {typeof metrics.columnCount === 'number' ? ` · ${metrics.columnCount} columns` : null}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-8">
        {charts.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
            {charts.map((spec) => (
              <div
                key={spec.id}
                className={cn(
                  'rounded-lg border border-border/80 bg-muted/20 p-4',
                  spec.type === 'table' && 'lg:col-span-2',
                )}
              >
                <SpecChart spec={spec} chartRemoteContext={chartRemoteContext} />
              </div>
            ))}
          </div>
        ) : null}

        {insights.length > 0 ? (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Key insights</h4>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {insights.map((item) => (
                <li key={item.id} className="leading-relaxed">
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export type AutoInsightsPanelLoaderProps = {
  datasetId: number
  accessToken: string
  className?: string
}

/**
 * Fetches persisted analysis for a dataset (GET /api/datasets/:id/analysis/).
 */
export function AutoInsightsPanelLoader({
  datasetId,
  accessToken,
  className,
}: AutoInsightsPanelLoaderProps) {
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const raw = await apiGet(`/api/datasets/${datasetId}/analysis/`, accessToken)
        if (!cancelled && isDatasetAnalysis(raw)) {
          setAnalysis(raw)
        } else if (!cancelled) {
          setAnalysis(null)
        }
      } catch {
        if (!cancelled) setAnalysis(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [datasetId, accessToken])

  return (
    <AutoInsightsPanel
      analysis={analysis}
      isLoading={loading}
      className={className}
      emptyMessage="Could not load analysis for this dataset."
      datasetId={datasetId}
      accessToken={accessToken}
    />
  )
}
