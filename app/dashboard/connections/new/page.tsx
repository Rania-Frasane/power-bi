'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function NewConnectionPage() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-lg">
        <Button variant="ghost" size="sm" className="mb-4 gap-2" asChild>
          <Link href="/dashboard/connections">
            <ArrowLeft className="h-4 w-4" />
            Back to connections
          </Link>
        </Button>
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>New connection</CardTitle>
            <CardDescription>
              SQL and API connection setup is not wired in this build yet. Use dataset
              file upload for now.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard/upload-dataset">Upload a dataset</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/connections">Cancel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
