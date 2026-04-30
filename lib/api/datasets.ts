const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export type DatasetListItem = {
  id: number
  name: string
  description?: string
}

function toUrl(path: string): string {
  const safePath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${safePath}`
}

async function fetchJson<T>(path: string): Promise<T> {
  const token =
    typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null
  const normalizedToken =
    token && token.startsWith('"') && token.endsWith('"')
      ? token.slice(1, -1)
      : token
  const response = await fetch(toUrl(path), {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(normalizedToken ? { Authorization: `Bearer ${normalizedToken}` } : {}),
    },
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(detail || `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

function parseList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { results?: unknown[] }).results)
  ) {
    return (payload as { results: T[] }).results
  }
  return []
}

export async function fetchDatasetList(): Promise<DatasetListItem[]> {
  const payload = await fetchJson<unknown>('/api/datasets/')
  return parseList<DatasetListItem>(payload)
}

export async function fetchDatasetById(
  id: string | number,
): Promise<Record<string, unknown>[]> {
  const payload = await fetchJson<{ data?: Record<string, unknown>[] }>(
    `/api/datasets/${id}/data/`,
  )
  return Array.isArray(payload.data) ? payload.data : []
}

export async function fetchDatasetSchema(id: string | number): Promise<string[]> {
  try {
    const payload = await fetchJson<{ columns?: string[] }>(
      `/api/datasets/${id}/schema/`,
    )
    if (Array.isArray(payload.columns)) return payload.columns
  } catch {
    // Fallback to infer from the first dataset row when schema endpoint is unavailable.
  }

  const rows = await fetchDatasetById(id)
  return rows.length > 0 ? Object.keys(rows[0]) : []
}
