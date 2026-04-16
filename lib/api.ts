/**
 * API utility for making authenticated requests to the backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ApiRequestOptions extends RequestInit {
  token?: string
}

export async function apiRequest(
  endpoint: string,
  options: ApiRequestOptions = {}
) {
  const { token, ...init } = options

  const headers = {
    'Content-Type': 'application/json',
    ...init.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`

  const response = await fetch(url, {
    ...init,
    headers,
  })

  if (response.status === 401) {
    // Token expired, clear auth
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
    }
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
