/**
 * Client types for the backend `Dataset.analysis` JSON contract.
 * The UI only renders; it does not interpret business columns beyond `mapping` + `data`.
 */

export type AnalysisChartMapping = {
  xKey?: string
  yKey?: string
  labelKey?: string
  nameKey?: string
  valueKey?: string
  /** For `type: "table"` — display order; cell value = `row[key]` */
  columnKeys?: string[]
  /**
   * When `"dataset"` (and UI has datasetId + accessToken), load pages via
   * GET /api/datasets/{id}/analysis/table/. Otherwise use embedded `data`.
   */
  tableRef?: string
}

export type AnalysisChartSpec = {
  id: string
  type: string
  title?: string
  mapping: AnalysisChartMapping
  data: Record<string, unknown>[]
}

export type AnalysisInsight = {
  id: string
  text: string
  evidence?: Record<string, unknown>
}

export type DatasetAnalysis = {
  version?: number
  columns?: unknown[]
  metrics?: Record<string, number | string | undefined>
  charts?: AnalysisChartSpec[]
  insights?: AnalysisInsight[]
}

export function isDatasetAnalysis(value: unknown): value is DatasetAnalysis {
  if (!value || typeof value !== 'object') return false
  const v = value as DatasetAnalysis
  return Array.isArray(v.charts) || Array.isArray(v.insights) || Array.isArray(v.columns)
}
