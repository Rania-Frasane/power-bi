/**
 * API utility for making authenticated requests to the backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ApiRequestOptions extends RequestInit {
  token?: string
}

function normalizeToken(token: string): string {
  const trimmed = token.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function clearLocalAuth() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

async function tryRefreshToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const rawRefreshToken = localStorage.getItem('refreshToken')
  if (!rawRefreshToken) return null

  const refresh = normalizeToken(rawRefreshToken)
  if (!refresh) return null

  try {
    const response = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })

    if (!response.ok) {
      clearLocalAuth()
      return null
    }

    const payload = await response.json().catch(() => null)
    const nextAccess = payload?.access ? normalizeToken(String(payload.access)) : ''
    if (!nextAccess) {
      clearLocalAuth()
      return null
    }

    localStorage.setItem('accessToken', nextAccess)
    return nextAccess
  } catch {
    clearLocalAuth()
    return null
  }
}

export async function apiRequest(
  endpoint: string,
  options: ApiRequestOptions = {},
  hasRetried = false
) {
  const { token, ...init } = options

  const headers = {
    'Content-Type': 'application/json',
    ...init.headers,
  }

  const normalizedToken = token ? normalizeToken(token) : ''
  if (normalizedToken) {
    headers['Authorization'] = `Bearer ${normalizedToken}`
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`

  const response = await fetch(url, {
    ...init,
    headers,
  })

  if (response.status === 401 && !hasRetried && endpoint !== '/api/token/refresh/') {
    const nextToken = await tryRefreshToken()
    if (nextToken) {
      return apiRequest(
        endpoint,
        {
          ...options,
          token: nextToken,
        },
        true,
      )
    }
  }

  if (response.status === 401) {
    clearLocalAuth()
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `API Error: ${response.status}`)
  }

  return response.json()
}

export async function apiGet(endpoint: string, token?: string) {
  return apiRequest(endpoint, { method: 'GET', token })
}

export async function apiPost(endpoint: string, data?: any, token?: string) {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  })
}

export async function apiPut(endpoint: string, data?: any, token?: string) {
  return apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
    token,
  })
}

export async function apiDelete(endpoint: string, token?: string) {
  return apiRequest(endpoint, { method: 'DELETE', token })
}

export async function apiPatch(endpoint: string, data?: any, token?: string) {
  return apiRequest(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
    token,
  })
}
