/**
 * Data service for fetching and processing dashboard data
 */

import { apiGet } from './api'

export interface DataFetchOptions {
  datasetId: number
  filters?: Record<string, any>
  limit?: number
  offset?: number
}

export interface DataResponse {
  data: any[]
  count: number
  next?: string
  previous?: string
}

/**
 * Fetch raw dataset data
 */
export async function fetchDatasetData(
  datasetId: number,
  accessToken: string,
  options?: DataFetchOptions
): Promise<DataResponse> {
  try {
    const params = new URLSearchParams()
    if (options?.limit) params.append('limit', String(options.limit))
    if (options?.offset) params.append('offset', String(options.offset))

    const queryString = params.toString()
    const url = `/api/datasets/${datasetId}/data/${queryString ? '?' + queryString : ''}`

    const response = await apiGet(url, accessToken)
    return response
  } catch (error) {
    console.error(`Failed to fetch dataset ${datasetId}:`, error)
    throw error
  }
}

/**
 * Get unique values for a column (for filter options)
 */
export async function getColumnValues(
  datasetId: number,
  columnName: string,
  accessToken: string
): Promise<string[]> {
  try {
    const response = await apiGet(
      `/api/datasets/${datasetId}/columns/${columnName}/values/`,
      accessToken
    )
    return response.values || []
  } catch (error) {
    console.error(`Failed to fetch column values:`, error)
    return []
  }
}

/**
 * Get column statistics
 */
export async function getColumnStats(
  datasetId: number,
  columnName: string,
  accessToken: string
): Promise<any> {
  try {
    const response = await apiGet(
      `/api/datasets/${datasetId}/columns/${columnName}/stats/`,
      accessToken
    )
    return response
  } catch (error) {
    console.error(`Failed to fetch column stats:`, error)
    return null
  }
}

/**
 * Filter data client-side based on filter criteria
 */
export function filterData(
  data: any[],
  filters: Record<string, any>
): any[] {
  if (!data || Object.keys(filters).length === 0) {
    return data
  }

  return data.filter((row) => {
    return Object.entries(filters).every(([column, value]) => {
      if (value === null || value === undefined || value === '') {
        return true
      }

      const cellValue = String(row[column]).toLowerCase()
      const filterValue = String(value).toLowerCase()

      // Support partial matching for text
      return cellValue.includes(filterValue)
    })
  })
}

/**
 * Aggregate data based on grouping and aggregation function
 */
export function aggregateData(
  data: any[],
  groupBy: string,
  aggregateColumn: string,
  aggregationFn: 'sum' | 'avg' | 'count' | 'min' | 'max' = 'sum'
): any[] {
  if (!data || data.length === 0) return []

  const grouped = data.reduce(
    (acc, row) => {
      const key = row[groupBy]
      if (!acc[key]) {
        acc[key] = {
          [groupBy]: key,
          values: [],
        }
      }
      const value = parseFloat(row[aggregateColumn])
      if (!isNaN(value)) {
        acc[key].values.push(value)
      }
      return acc
    },
    {} as Record<string, any>
  )

  return Object.entries(grouped).map(([key, group]: [string, any]) => {
    const values = group.values
    let aggregated = 0

    switch (aggregationFn) {
      case 'sum':
        aggregated = values.reduce((a: number, b: number) => a + b, 0)
        break
      case 'avg':
        aggregated = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0
        break
      case 'count':
        aggregated = values.length
        break
      case 'min':
        aggregated = Math.min(...values)
        break
      case 'max':
        aggregated = Math.max(...values)
        break
    }

    return {
      [groupBy]: key,
      [aggregateColumn]: Math.round(aggregated * 100) / 100,
    }
  })
}

/**
 * Get data statistics (min, max, mean, median)
 */
export function getDataStats(
  data: any[],
  column: string
): {
  min: number
  max: number
  avg: number
  median: number
  count: number
} {
  const values = data
    .map((row) => parseFloat(row[column]))
    .filter((v) => !isNaN(v))
    .sort((a, b) => a - b)

  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, median: 0, count: 0 }
  }

  const sum = values.reduce((a, b) => a + b, 0)
  const avg = sum / values.length
  const median = values.length % 2 === 0
    ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
    : values[Math.floor(values.length / 2)]

  return {
    min: values[0],
    max: values[values.length - 1],
    avg,
    median,
    count: values.length,
  }
}

/**
 * Search data across all columns
 */
export function searchData(
  data: any[],
  searchTerm: string
): any[] {
  if (!searchTerm) return data

  const lowerSearchTerm = searchTerm.toLowerCase()

  return data.filter((row) => {
    return Object.values(row).some((value) =>
      String(value).toLowerCase().includes(lowerSearchTerm)
    )
  })
}
