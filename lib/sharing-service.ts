/**
 * Sharing service for managing dashboard access and sharing
 */

import { apiPost, apiGet, apiPut, apiDelete } from './api'

export interface DashboardShare {
  id: number
  dashboard: number
  shared_with_user?: number
  shared_with_email?: string
  permission: 'view' | 'edit' | 'admin'
  created_at: string
  expires_at?: string
}

export interface ShareToken {
  token: string
  dashboard: number
  permission: 'view' | 'edit'
  expires_at?: string
  max_uses?: number
  current_uses: number
}

/**
 * Share dashboard with a specific user
 */
export async function shareDashboardWithUser(
  dashboardId: number,
  email: string,
  permission: 'view' | 'edit' | 'admin',
  accessToken: string
): Promise<DashboardShare> {
  return apiPost(
    '/api/dashboard-shares/',
    {
      dashboard: dashboardId,
      shared_with_email: email,
      permission,
    },
    accessToken
  )
}

/**
 * Share dashboard with a group
 */
export async function shareDashboardWithGroup(
  dashboardId: number,
  groupId: number,
  permission: 'view' | 'edit' | 'admin',
  accessToken: string
): Promise<any> {
  return apiPost(
    '/api/dashboard-shares/',
    {
      dashboard: dashboardId,
      shared_with_group: groupId,
      permission,
    },
    accessToken
  )
}

/**
 * Create a shareable link/token
 */
export async function createShareToken(
  dashboardId: number,
  permission: 'view' | 'edit' = 'view',
  expiresInDays?: number,
  maxUses?: number,
  accessToken?: string
): Promise<ShareToken> {
  const data: any = {
    dashboard: dashboardId,
    permission,
  }

  if (expiresInDays) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)
    data.expires_at = expiresAt.toISOString()
  }

  if (maxUses) {
    data.max_uses = maxUses
  }

  return apiPost('/api/dashboard-share-tokens/', data, accessToken!)
}

/**
 * Get all shares for a dashboard
 */
export async function getDashboardShares(
  dashboardId: number,
  accessToken: string
): Promise<DashboardShare[]> {
  const response = await apiGet(
    `/api/dashboards/${dashboardId}/shares/`,
    accessToken
  )
  return response.results || response || []
}

/**
 * Get all share tokens for a dashboard
 */
export async function getDashboardShareTokens(
  dashboardId: number,
  accessToken: string
): Promise<ShareToken[]> {
  const response = await apiGet(
    `/api/dashboards/${dashboardId}/share-tokens/`,
    accessToken
  )
  return response.results || response || []
}

/**
 * Update share permissions
 */
export async function updateShare(
  shareId: number,
  permission: 'view' | 'edit' | 'admin',
  accessToken: string
): Promise<DashboardShare> {
  return apiPut(
    `/api/dashboard-shares/${shareId}/`,
    { permission },
    accessToken
  )
}

/**
 * Remove a share
 */
export async function removeShare(
  shareId: number,
  accessToken: string
): Promise<void> {
  await apiDelete(`/api/dashboard-shares/${shareId}/`, accessToken)
}

/**
 * Revoke a share token
 */
export async function revokeShareToken(
  tokenId: number,
  accessToken: string
): Promise<void> {
  await apiDelete(`/api/dashboard-share-tokens/${tokenId}/`, accessToken)
}

/**
 * Generate a public share URL
 */
export function generateShareUrl(token: string, baseUrl?: string): string {
  const url = baseUrl || typeof window !== 'undefined' ? window.location.origin : ''
  return `${url}/dashboard/shared/${token}`
}

/**
 * Check if a token is valid
 */
export async function validateShareToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/dashboard-share-tokens/validate/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      }
    )
    return response.ok
  } catch (error) {
    console.error('Token validation failed:', error)
    return false
  }
}

/**
 * Get dashboard from share token
 */
export async function getDashboardByToken(token: string): Promise<any> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/dashboards/shared/${token}/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    if (!response.ok) {
      throw new Error('Failed to fetch shared dashboard')
    }
    return response.json()
  } catch (error) {
    console.error('Failed to get dashboard by token:', error)
    throw error
  }
}

/**
 * Share settings/configuration
 */
export const SHARE_PERMISSIONS = {
  view: {
    label: 'View Only',
    description: 'Can view the dashboard but cannot edit',
  },
  edit: {
    label: 'Can Edit',
    description: 'Can view and edit the dashboard',
  },
  admin: {
    label: 'Admin',
    description: 'Can manage the dashboard and sharing',
  },
}

/**
 * Default share expiration options
 */
export const SHARE_EXPIRATION_OPTIONS = [
  { label: 'Never', value: null },
  { label: '1 day', value: 1 },
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
]
