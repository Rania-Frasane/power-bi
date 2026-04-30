'use client'

import { usePathname } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { dashboardNavItems, isNavActive } from '@/lib/dashboard-nav'

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-card md:flex min-h-0">
      <div className="shrink-0 border-b border-border p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-foreground">Analytics</h1>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {dashboardNavItems.map((item) => {
          const Icon = item.icon
          const active = isNavActive(pathname, item.href)

          return (
            <Link key={item.href} href={item.href} className="block">
              <Button
                variant="ghost"
                className={cn(
                  'h-10 w-full justify-start gap-3 rounded-lg transition-colors',
                  active
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate text-sm font-medium">{item.label}</span>
              </Button>
            </Link>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <div className="rounded-lg bg-muted p-3">
          <p className="mb-1 text-xs font-semibold text-foreground">Need help?</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Export dataset history from the Datasets page (HTML or print to PDF).
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-full border-border bg-background text-xs hover:border-primary hover:bg-background"
            type="button"
          >
            View Docs
          </Button>
        </div>
      </div>
    </aside>
  )
}
