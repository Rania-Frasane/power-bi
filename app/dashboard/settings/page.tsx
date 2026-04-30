'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'

const AUTO_REFRESH_KEY = 'dashboard_auto_refresh_ms'
const THEME_SENTINEL = '__theme__'

function readAutoRefresh(): string {
  if (typeof window === 'undefined') return '300000'
  const v = localStorage.getItem(AUTO_REFRESH_KEY)
  return v && /^\d+$/.test(v) ? v : '300000'
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const { theme, setTheme } = useTheme()
  const [autoRefreshMs, setAutoRefreshMs] = useState<string>(readAutoRefresh())

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-6">
        <h1 className="text-3xl font-bold text-foreground mb-8">Settings</h1>

        {/* Profile Settings */}
        <Card className="bg-card border-border mb-6 max-w-2xl">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Manage your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel>First Name</FieldLabel>
                    <Input
                      value={user?.first_name || ''}
                      readOnly
                      className="bg-muted border-input"
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup>
                  <Field>
                    <FieldLabel>Last Name</FieldLabel>
                    <Input
                      value={user?.last_name || ''}
                      readOnly
                      className="bg-muted border-input"
                    />
                  </Field>
                </FieldGroup>
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    value={user?.email || ''}
                    readOnly
                    className="bg-muted border-input"
                  />
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel>Username</FieldLabel>
                  <Input
                    value={user?.username || ''}
                    readOnly
                    className="bg-muted border-input"
                  />
                </Field>
              </FieldGroup>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="bg-card border-border max-w-2xl">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your dashboard experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel>Default Theme</FieldLabel>
                  <Select
                    value={theme || THEME_SENTINEL}
                    onValueChange={(v) => {
                      if (v === THEME_SENTINEL) return
                      setTheme(v)
                      toast.success('Theme updated')
                    }}
                  >
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue placeholder="Choose theme" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value={THEME_SENTINEL}>Select…</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel>Auto-refresh Interval</FieldLabel>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Select
                      value={autoRefreshMs}
                      onValueChange={(v) => {
                        setAutoRefreshMs(v)
                        if (typeof window !== 'undefined') localStorage.setItem(AUTO_REFRESH_KEY, v)
                        toast.success('Auto-refresh saved')
                      }}
                    >
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Interval" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="60000">Every 1 min</SelectItem>
                        <SelectItem value="300000">Every 5 min</SelectItem>
                        <SelectItem value="900000">Every 15 min</SelectItem>
                        <SelectItem value="1800000">Every 30 min</SelectItem>
                        <SelectItem value="0">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-border"
                      onClick={() => {
                        setAutoRefreshMs('300000')
                        if (typeof window !== 'undefined') localStorage.setItem(AUTO_REFRESH_KEY, '300000')
                        toast.success('Auto-refresh reset')
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel>Local storage</FieldLabel>
                  <div className="text-sm text-muted-foreground mb-3">
                    Clear locally saved dashboard layouts and preferences.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-border"
                      onClick={() => {
                        if (typeof window === 'undefined') return
                        const keys = Object.keys(localStorage)
                        for (const k of keys) {
                          if (k.startsWith('dashboard:') || k.startsWith('dashboard_config')) {
                            localStorage.removeItem(k)
                          }
                        }
                        toast.success('Local dashboard data cleared')
                      }}
                    >
                      Clear dashboard data
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-border"
                      onClick={() => {
                        if (typeof window === 'undefined') return
                        const payload: Record<string, string> = {}
                        for (const k of Object.keys(localStorage)) {
                          if (k.startsWith('dashboard:') || k === AUTO_REFRESH_KEY) {
                            payload[k] = String(localStorage.getItem(k) ?? '')
                          }
                        }
                        const json = JSON.stringify(payload, null, 2)
                        downloadJson(json)
                      }}
                    >
                      Export settings (JSON)
                    </Button>
                  </div>
                </Field>
              </FieldGroup>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function downloadJson(json: string) {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `settings-${new Date().toISOString().slice(0, 10)}.json`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
