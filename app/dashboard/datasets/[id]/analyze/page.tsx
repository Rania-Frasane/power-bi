'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { Sparkles, BarChart3, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

interface DatasetAnalysis {
  dataset_id: number
  summary: string
  key_patterns: string[]
  anomalies: string[]
  data_quality_score: number
  data_quality_issues: string[]
  recommendations: string[]
  column_insights: Record<string, any>
  recommended_visualizations: any[]
  dashboard_layout: any
}

export default function DatasetAnalyzePage() {
  const router = useRouter()
  const params = useParams()
  const { accessToken } = useAuth()
  const datasetId = params.id as string
  
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(null)
  const [isCreatingDashboard, setIsCreatingDashboard] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (datasetId && accessToken) {
      analyzeDataset()
    }
  }, [datasetId, accessToken])

  const analyzeDataset = async () => {
    try {
      setIsAnalyzing(true)
      setError(null)
      
      const token = accessToken || localStorage.getItem('access_token')
      
      console.log('[v0] Starting LLM analysis for dataset:', datasetId)
      
      const response = await fetch(`http://localhost:8000/api/datasets/${datasetId}/analyze/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData?.error || 'Analysis failed')
      }

      console.log('[v0] Analysis completed:', responseData)
      setAnalysis(responseData)
      toast.success('Dataset analyzed successfully!')

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Analysis failed'
      console.error('[v0] Analysis error:', errorMsg)
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const createDashboard = async () => {
    try {
      setIsCreatingDashboard(true)
      const token = accessToken || localStorage.getItem('access_token')

      const response = await fetch('http://localhost:8000/api/dashboards/generate/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataset_id: parseInt(datasetId),
          dashboard_name: `Dataset ${datasetId} Dashboard`,
          include_table: true,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData?.error || 'Dashboard creation failed')
      }

      console.log('[v0] Dashboard created:', responseData)
      toast.success('Dashboard created successfully!')
      router.push(`/dashboard/dashboards/${responseData.dashboard.id}`)

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Dashboard creation failed'
      console.error('[v0] Dashboard creation error:', errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsCreatingDashboard(false)
    }
  }

  if (isAnalyzing) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Spinner className="w-8 h-8" />
              <div className="text-center">
                <h2 className="text-lg font-semibold text-foreground mb-2">Analyzing Your Dataset</h2>
                <p className="text-sm text-muted-foreground">
                  Using AI to extract insights and generate recommendations...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <div className="text-center">
                <h2 className="text-lg font-semibold text-foreground mb-2">Analysis Failed</h2>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
              </div>
              <Button onClick={() => router.back()} variant="outline" className="w-full">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6">
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Sparkles className="w-8 h-8" />
            Dataset Analysis
          </h1>
          <p className="text-muted-foreground">
            AI-powered insights and recommendations for your data
          </p>
        </div>

        {analysis && (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">{analysis.summary}</p>
              </CardContent>
            </Card>

            {/* Data Quality */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Data Quality Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">Quality Score</span>
                    <span className="text-2xl font-bold text-primary">{analysis.data_quality_score}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${analysis.data_quality_score}%` }}
                    />
                  </div>
                </div>

                {analysis.data_quality_issues.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      Issues Detected
                    </h4>
                    <ul className="space-y-1">
                      {analysis.data_quality_issues.map((issue, i) => (
                        <li key={i} className="text-sm text-muted-foreground">• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Key Patterns */}
            {analysis.key_patterns.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Key Patterns Discovered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.key_patterns.map((pattern, i) => (
                      <li key={i} className="flex items-start gap-2 text-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{pattern}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Anomalies */}
            {analysis.anomalies.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    Detected Anomalies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.anomalies.map((anomaly, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {anomaly}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-foreground">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommended Visualizations */}
            {analysis.recommended_visualizations.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Suggested Visualizations</CardTitle>
                  <CardDescription>
                    {analysis.recommended_visualizations.length} chart types recommended for your data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {analysis.recommended_visualizations.map((viz, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted border border-border">
                        <h4 className="font-medium text-foreground capitalize">{viz.type} Chart</h4>
                        <p className="text-xs text-muted-foreground mt-1">{viz.description}</p>
                        {viz.title && (
                          <p className="text-sm text-foreground mt-2">Title: {viz.title}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={createDashboard}
                disabled={isCreatingDashboard}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isCreatingDashboard ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Creating Dashboard...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Create Dashboard
                  </>
                )}
              </Button>
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="flex-1 border-border hover:bg-muted"
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
