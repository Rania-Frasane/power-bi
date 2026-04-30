import type { LucideIcon } from 'lucide-react'
import { Cable, Database, Home, Settings } from 'lucide-react'

export type DashboardNavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export const dashboardNavItems: DashboardNavItem[] = [
  { label: 'Dashboards', href: '/dashboard', icon: Home },
  { label: 'Datasets', href: '/dashboard/datasets', icon: Database },
  { label: 'Connections', href: '/dashboard/connections', icon: Cable },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/dashboard/'
  }
  if (href === '/dashboard/datasets') {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname.startsWith('/dashboard/upload-dataset')
    )
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
