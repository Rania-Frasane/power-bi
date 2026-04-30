import { apiGet } from '@/lib/api'
import {
  isDatasetAnalysis,
  type DatasetAnalysis,
} from '@/lib/dataset-analysis-types'

/**
 * Loads persisted analysis for many datasets in parallel (for HTML/PDF export).
 */
export async function fetchDatasetAnalysesMap(
  accessToken: string,
  datasetIds: number[],
): Promise<Map<number, DatasetAnalysis | null>> {
  const map = new Map<number, DatasetAnalysis | null>()
  await Promise.all(
    datasetIds.map(async (id) => {
      try {
        const raw = await apiGet(`/api/datasets/${id}/analysis/`, accessToken)
        map.set(id, isDatasetAnalysis(raw) ? raw : null)
      } catch {
        map.set(id, null)
      }
    }),
  )
  return map
}
