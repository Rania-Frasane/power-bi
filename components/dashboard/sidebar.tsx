'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BarChart3, Database, Settings, Home } from 'lucide-react'
import Link from 'next/link'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    label: 'Dashboards',
    href: '/dashboard',
    icon: <Home className="w-5 h-5" />,
  },
  {
    label: 'Datasets',
    href: '/dashboard/datasets',
    icon: <Database className="w-5 h-5" />,
  },
  {
    label: 'Connections',
    href: '/dashboard/connections',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: <Settings className="w-5 h-5" />,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Analytics</h1>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 rounded-lg h-10 transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </Button>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="p-3 rounded-lg bg-muted">
          <p className="text-xs font-semibold text-foreground mb-1">Need help?</p>
          <p className="text-xs text-muted-foreground mb-3">
            Check out our documentation to learn more.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs bg-background border-border hover:bg-background hover:border-primary"
          >
            View Docs
          </Button>
        </div>
      </div>
    </aside>
  )
}
