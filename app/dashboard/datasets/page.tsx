'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiGet } from '@/lib/api'
import { parseListResponse } from '@/lib/list-api'
import { fetchDatasetAnalysesMap } from '@/lib/fetch-dataset-analyses'
import {
  buildDatasetPortfolioHtml,
  buildSingleDatasetReportHtml,
  downloadHtmlFile,
  openHistoryPrintWindow,
  type DatasetHistoryRow,
} from '@/lib/dataset-history-export'
import { AutoInsightsPanelLoader } from '@/components/dashboard/auto-insights-panel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Empty } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronDown, FileDown, Printer, Upload, Database } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Dataset extends DatasetHistoryRow {}

function sortDatasetsByDate(datasets: Dataset[]): Dataset[] {
  return [...datasets].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export default function DatasetsPage() {
  const { accessToken } = useAuth()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [insightsOpenForId, setInsightsOpenForId] = useState<number | null>(null)

  const sortedHistory = useMemo(
    () => sortDatasetsByDate(datasets),
    [datasets],
  )

  const fetchDatasets = useCallback(async () => {
    if (!accessToken) return
    setIsLoading(true)
    try {
      const data = await apiGet('/api/datasets/', accessToken)
      setDatasets(parseListResponse<Dataset>(data))
    } catch (error) {
      console.error('Failed to fetch datasets:', error)
      toast.error('Could not load datasets')
      setDatasets([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }
    fetchDatasets()
  }, [accessToken, fetchDatasets])

  useEffect(() => {
    if (typeof window === 'undefined' || datasets.length === 0) return
    const applyHash = () => {
      const m = /^#dataset-(\d+)$/.exec(window.location.hash)
      if (!m) return
      const id = Number(m[1])
      if (!Number.isFinite(id) || !datasets.some((d) => d.id === id)) return
      setInsightsOpenForId(id)
      window.requestAnimationFrame(() => {
        document
          .getElementById(`dataset-${id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [datasets])

  const runPortfolioExport = useCallback(
    async (kind: 'html' | 'pdf') => {
      if (!accessToken || sortedHistory.length === 0) return
      setExporting(true)
      try {
        toast.message('Loading analysis for all datasets…')
        const map = await fetchDatasetAnalysesMap(
          accessToken,
          sortedHistory.map((d) => d.id),
        )
        const origin =
          typeof window !== 'undefined' ? window.location.origin : ''
        const html = buildDatasetPortfolioHtml(sortedHistory, map, {
          appOrigin: origin || 'http://localhost:3000',
          title: 'Dataset portfolio — history, insights & chart tables',
        })
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
        if (kind === 'html') {
          downloadHtmlFile(`dataset-portfolio-${stamp}.html`, html)
          toast.success('Portfolio HTML downloaded (insights, tables, share links)')
        } else {
          openHistoryPrintWindow(html)
          toast.message('Print dialog opened — save as PDF from there')
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Export failed')
      } finally {
        setExporting(false)
      }
    },
    [accessToken, sortedHistory],
  )

  const runSingleDatasetExport = useCallback(
    async (dataset: Dataset, kind: 'html' | 'pdf') => {
      if (!accessToken) return
      try {
        const analysis = await apiGet(`/api/datasets/${dataset.id}/analysis/`, accessToken).catch(
          () => null,
        )
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        const html = buildSingleDatasetReportHtml(dataset, analysis, {
          appOrigin: origin || 'http://localhost:3000',
          title: `Dataset report — ${dataset.name}`,
        })
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
        const safeName = dataset.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
        if (kind === 'html') {
          downloadHtmlFile(`${safeName || 'dataset'}-${dataset.id}-${stamp}.html`, html)
          toast.success(`HTML exported for "${dataset.name}"`)
        } else {
          openHistoryPrintWindow(html)
          toast.message(`Print dialog opened for "${dataset.name}" (save as PDF)`)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Dataset export failed')
      }
    },
    [accessToken],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-8">
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">Datasets</h1>
              <p className="text-muted-foreground">
                Exports include upload history, share links, column profiles, insights, and
                chart data as tables (HTML or Print → PDF).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 border-border"
                disabled={sortedHistory.length === 0 || exporting || !accessToken}
                onClick={() => void runPortfolioExport('html')}
              >
                <FileDown className="h-4 w-4" />
                {exporting ? 'Preparing…' : 'Export HTML'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 border-border"
                disabled={sortedHistory.length === 0 || exporting || !accessToken}
                onClick={() => void runPortfolioExport('pdf')}
              >
                <Printer className="h-4 w-4" />
                {exporting ? 'Preparing…' : 'Print / PDF'}
              </Button>
              <Button
                asChild
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link href="/dashboard/upload-dataset">
                  <Upload className="h-4 w-4" />
                  Upload
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-lg border border-border bg-card"
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
                <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Upload className="h-4 w-4" />
                  Upload Dataset
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-10">
            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">
                Upload history
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Newest first. Use export buttons above for a full portfolio (each dataset’s
                analysis, tables, insights, and in-app share links).
              </p>
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Rows</TableHead>
                      <TableHead>Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedHistory.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {d.name}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {d.source_type.toUpperCase()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {d.row_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                          {new Date(d.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-semibold text-foreground">Cards & insights</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sortedHistory.map((dataset) => (
                  <Card
                    key={dataset.id}
                    id={`dataset-${dataset.id}`}
                    className="scroll-mt-24 border-border bg-card"
                  >
                    <CardHeader>
                      <CardTitle className="line-clamp-2">{dataset.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {dataset.source_type.toUpperCase()} ·{' '}
                        {dataset.row_count.toLocaleString()} rows
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {dataset.description || 'No description'}
                      </p>
                      <Collapsible
                        open={insightsOpenForId === dataset.id}
                        onOpenChange={(open) =>
                          setInsightsOpenForId(open ? dataset.id : null)
                        }
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-between gap-2 border-border font-normal"
                          >
                            <span>Auto insights</span>
                            <ChevronDown
                              className={`h-4 w-4 shrink-0 transition-transform ${insightsOpenForId === dataset.id ? 'rotate-180' : ''}`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3 data-[state=closed]:animate-none">
                          {insightsOpenForId === dataset.id && accessToken ? (
                            <AutoInsightsPanelLoader
                              datasetId={dataset.id}
                              accessToken={accessToken}
                              className="shadow-none"
                            />
                          ) : null}
                        </CollapsibleContent>
                      </Collapsible>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2 border-border"
                          onClick={() => void runSingleDatasetExport(dataset, 'html')}
                        >
                          <FileDown className="h-4 w-4" />
                          Export HTML
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2 border-border"
                          onClick={() => void runSingleDatasetExport(dataset, 'pdf')}
                        >
                          <Printer className="h-4 w-4" />
                          Export PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
