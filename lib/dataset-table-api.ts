/**
 * GET /api/datasets/{id}/analysis/table/
 * Server-side pagination, search, and sort for tabular datasets.
 */

import { apiGet } from '@/lib/api'

/** Must match `mapping.tableRef` emitted by Django analysis for preview tables. */
export const DATASET_TABLE_REF = 'dataset'

export type DatasetTablePageResponse = {
  columnKeys: string[]
  rows: Record<string, unknown>[]
  total: number
  page?: number
  page_size?: number
  page_count?: number
}

export type DatasetTableQuery = {
  page: number
  page_size: number
  q?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export function buildDatasetTablePath(
  datasetId: number,
  params: DatasetTableQuery,
): string {
  const sp = new URLSearchParams()
  sp.set('page', String(params.page))
  sp.set('page_size', String(params.page_size))
  if (params.q?.trim()) sp.set('q', params.q.trim())
  if (params.sort?.trim()) sp.set('sort', params.sort.trim())
  if (params.order) sp.set('order', params.order)
  return `/api/datasets/${datasetId}/analysis/table/?${sp.toString()}`
}

export async function fetchDatasetTablePage(
  datasetId: number,
  accessToken: string,
  params: DatasetTableQuery,
): Promise<DatasetTablePageResponse> {
  return apiGet(buildDatasetTablePath(datasetId, params), accessToken)
}
