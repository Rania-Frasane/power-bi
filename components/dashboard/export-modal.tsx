'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import {
  exportAsCSV,
  exportAsJSON,
  exportAsHTML,
  EXPORT_FORMATS,
  createExportFilename,
} from '@/lib/export-service'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { Download, X } from 'lucide-react'

interface ExportModalProps {
  dashboardName: string
  data: Record<string, any[]>
  onClose: () => void
  isOpen: boolean
}

export function ExportModal({ dashboardName, data, onClose, isOpen }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'html'>('csv')
  const [selectedDataset, setSelectedDataset] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)
  const [includeAllData, setIncludeAllData] = useState(false)

  const datasets = Object.entries(data).filter(([_, d]) => d.length > 0)

  const handleExport = async () => {
    if (!includeAllData && !selectedDataset) {
      toast.error('Please select a dataset to export')
      return
    }

    setIsExporting(true)
    try {
      const exportData = includeAllData
        ? datasets.flatMap(([_, d]) => d)
        : data[selectedDataset] || []

      const filename = createExportFilename(dashboardName, EXPORT_FORMATS[selectedFormat].extension)

      switch (selectedFormat) {
        case 'csv':
          exportAsCSV(exportData, filename)
          break
        case 'json':
          exportAsJSON(exportData, filename)
          break
        case 'html':
          exportAsHTML(exportData, dashboardName, filename)
          break
      }

      toast.success(`Dashboard exported as ${selectedFormat.toUpperCase()}`)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border">
          <div>
            <CardTitle>Export Dashboard</CardTitle>
            <CardDescription>Download your dashboard data in various formats</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* Format Selection */}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="format">Export Format</FieldLabel>
              <Select value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as any)}>
                <SelectTrigger className="bg-background border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {Object.entries(EXPORT_FORMATS).map(([key, format]) => (
                    <SelectItem key={key} value={key}>
                      <div>
                        <div className="font-medium">{format.label}</div>
                        <div className="text-xs text-muted-foreground">{format.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          {/* Dataset Selection */}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="dataset">Data Source</FieldLabel>
              {datasets.length > 1 ? (
                <>
                  <div className="mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeAllData}
                        onChange={(e) => setIncludeAllData(e.target.checked)}
                        className="rounded border-input"
                      />
                      <span className="text-sm">Export all datasets combined</span>
                    </label>
                  </div>
                  {!includeAllData && (
                    <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Select dataset" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {datasets.map(([name, d]) => (
                          <SelectItem key={name} value={name}>
                            {name} ({d.length} rows)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              ) : datasets.length === 1 ? (
                <div className="p-3 bg-muted rounded text-sm text-foreground">
                  {datasets[0][0]} ({datasets[0][1].length} rows)
                </div>
              ) : (
                <div className="p-3 bg-muted rounded text-sm text-muted-foreground">
                  No data available to export
                </div>
              )}
            </Field>
          </FieldGroup>

          {/* File Size Info */}
          {selectedDataset && (
            <div className="p-3 bg-muted/50 rounded text-xs text-muted-foreground">
              <p>
                {data[selectedDataset]?.length || 0} rows will be exported
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button
              onClick={handleExport}
              disabled={
                isExporting || datasets.length === 0 || (!includeAllData && !selectedDataset)
              }
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              {isExporting ? (
                <>
                  <Spinner className="w-4 h-4" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export
                </>
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-border hover:bg-muted"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
