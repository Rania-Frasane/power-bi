'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import type { DatasetAnalysis } from '@/lib/dataset-analysis-types'
import { AutoInsightsPanel } from '@/components/dashboard/auto-insights-panel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { Upload, FileUp, X } from 'lucide-react'

export default function UploadDatasetPage() {
  const router = useRouter()
  const { accessToken } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [lastAnalysis, setLastAnalysis] = useState<DatasetAnalysis | null>(null)
  const [lastDatasetId, setLastDatasetId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/json',
      ]
      
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Please upload a CSV, Excel, or JSON file')
        return
      }

      setFile(selectedFile)
      // Auto-fill name from filename
      setFormData((prev) => ({
        ...prev,
        name: selectedFile.name.split('.')[0],
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      toast.error('Please select a file')
      return
    }

    if (!formData.name.trim()) {
      toast.error('Please enter a dataset name')
      return
    }

    setIsUploading(true)
    setLastAnalysis(null)
    setLastDatasetId(null)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('name', formData.name)
      uploadFormData.append('description', formData.description)

      let sourceType = ''
      if (file.type === 'text/csv') sourceType = 'csv'
      else if (
        file.type ===
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel'
      )
        sourceType = 'excel'
      else if (file.type === 'application/json') sourceType = 'json'
      else {
        toast.error('Unsupported file type')
        setIsUploading(false)
        return
      }

      uploadFormData.append('source_type', sourceType)
      uploadFormData.append('file', file)

      const token = accessToken || localStorage.getItem('access_token')

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiBase}/api/datasets/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      })
      const contentType = response.headers.get('content-type')
      let responseData: {
        id?: number
        analysis?: DatasetAnalysis
        detail?: string
      } | null = null
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json()
      }

      if (!response.ok) {
        throw new Error(responseData?.detail || 'Upload failed')
      }
      toast.success('Dataset uploaded successfully!')
      const analysis = responseData?.analysis
      if (analysis && typeof analysis === 'object') {
        setLastAnalysis(analysis as DatasetAnalysis)
      }
      if (typeof responseData?.id === 'number') {
        setLastDatasetId(responseData.id)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row lg:items-start">
        <div className="w-full max-w-md shrink-0">
        <h1 className="text-3xl font-bold text-foreground mb-2">Upload Dataset</h1>
        <p className="text-muted-foreground mb-8">
          Upload CSV, Excel, or JSON files to use in your dashboards
        </p>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>New Dataset</CardTitle>
            <CardDescription>Upload your data file</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* File Upload */}
              <FieldGroup>
                <Field>
                  <FieldLabel>Data File</FieldLabel>
                  <label className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/30">
                    {file ? (
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <FileUp className="w-4 h-4" />
                        <span>{file.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            setFile(null)
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Click to upload</p>
                          <p className="text-xs text-muted-foreground">
                            CSV, Excel, or JSON
                          </p>
                        </div>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.json"
                      onChange={handleFileChange}
                      className="hidden"
                      required
                    />
                  </label>
                </Field>
              </FieldGroup>

              {/* Name */}
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">Dataset Name</FieldLabel>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Sales Data 2024"
                    className="bg-background border-input"
                    required
                  />
                </Field>
              </FieldGroup>

              {/* Description */}
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="description">Description (Optional)</FieldLabel>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Describe your dataset..."
                    className="bg-background border-input"
                  />
                </Field>
              </FieldGroup>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-4 sm:flex-row">
                <Button
                  type="submit"
                  disabled={isUploading || !file}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isUploading ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Dataset
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => router.back()}
                  variant="outline"
                  className="flex-1 border-border hover:bg-muted"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          {lastAnalysis ? (
            <>
              <AutoInsightsPanel
                analysis={lastAnalysis}
                datasetId={lastDatasetId ?? undefined}
                accessToken={
                  accessToken ||
                  (typeof window !== 'undefined'
                    ? localStorage.getItem('access_token') || undefined
                    : undefined)
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href="/dashboard/datasets">View all datasets</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLastAnalysis(null)
                    setLastDatasetId(null)
                    setFile(null)
                  }}
                >
                  Upload another file
                </Button>
              </div>
            </>
          ) : (
            <Card className="border-dashed border-border bg-muted/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-muted-foreground">Auto insights</CardTitle>
                <CardDescription>
                  After a successful upload, charts and key insights from the server appear here.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}