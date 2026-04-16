'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'

export default function SettingsPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

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
                  <div className="text-sm text-muted-foreground">
                    Currently set to system preference
                  </div>
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel>Auto-refresh Interval</FieldLabel>
                  <div className="text-sm text-muted-foreground">
                    Set how often dashboards refresh automatically
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
