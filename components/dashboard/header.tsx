'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Menu, User, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { dashboardNavItems, isNavActive } from '@/lib/dashboard-nav'
import Link from 'next/link'

export function DashboardHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 border-border bg-card p-0">
            <SheetHeader className="border-b border-border px-4 py-4 text-left">
              <SheetTitle className="text-base">Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-3">
              {dashboardNavItems.map((item) => {
                const Icon = item.icon
                const active = isNavActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <h2 className="truncate text-base font-semibold text-foreground md:text-lg">
          Analytics Dashboard
        </h2>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-10 w-10 rounded-full border-border bg-background p-0 hover:bg-muted"
            >
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-border bg-card">
            <div className="px-2 py-1.5 text-sm">
              <p className="font-semibold text-foreground">
                {user?.first_name || user?.username || 'User'}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => router.push('/dashboard/settings')}
              className="cursor-pointer hover:bg-muted"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive hover:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
