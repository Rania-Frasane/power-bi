'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WidgetPosition } from '@/lib/dashboard-builder-context'

interface WidgetRendererProps {
  widget: WidgetPosition
  data: any[]
  isLoading?: boolean
}

const CHART_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
]

function aggregateData(
  data: any[],
  xAxis: string,
  yAxis: string,
  aggregation: string = 'sum'
) {
  if (!data || !xAxis || !yAxis) return data

  const grouped = data.reduce(
    (acc, item) => {
      const key = item[xAxis]
      if (!acc[key]) {
        acc[key] = { [xAxis]: key, values: [] }
      }
      acc[key].values.push(parseFloat(item[yAxis]) || 0)
      return acc
    },
    {} as Record<string, any>
  )

  return Object.values(grouped).map((group: any) => {
    const values = group.values
    let aggregatedValue = 0

    switch (aggregation) {
      case 'sum':
        aggregatedValue = values.reduce((a: number, b: number) => a + b, 0)
        break
      case 'avg':
        aggregatedValue = values.reduce((a: number, b: number) => a + b, 0) / values.length
        break
      case 'count':
        aggregatedValue = values.length
        break
      case 'min':
        aggregatedValue = Math.min(...values)
        break
      case 'max':
        aggregatedValue = Math.max(...values)
        break
      default:
        aggregatedValue = values.reduce((a: number, b: number) => a + b, 0)
    }

    return {
      [group[xAxis]]: group[xAxis],
      [yAxis]: Math.round(aggregatedValue * 100) / 100,
    }
  })
}

function BarChartWidget({
  widget,
  data,
}: {
  widget: WidgetPosition
  data: any[]
}) {
  const processedData = useMemo(
    () => aggregateData(data, widget.config.xAxis, widget.config.yAxis, widget.config.aggregation),
    [data, widget.config]
  )

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={processedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={widget.config.xAxis} />
        <YAxis />
        <Tooltip />
        <Bar dataKey={widget.config.yAxis} fill={CHART_COLORS[0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function LineChartWidget({
  widget,
  data,
}: {
  widget: WidgetPosition
  data: any[]
}) {
  const processedData = useMemo(
    () => aggregateData(data, widget.config.xAxis, widget.config.yAxis, widget.config.aggregation),
    [data, widget.config]
  )

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={processedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={widget.config.xAxis} />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey={widget.config.yAxis} stroke={CHART_COLORS[0]} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function PieChartWidget({
  widget,
  data,
}: {
  widget: WidgetPosition
  data: any[]
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey={widget.config.yAxis}
          nameKey={widget.config.xAxis}
          cx="50%"
          cy="50%"
          outerRadius={80}
          label
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

function TableWidget({
  widget,
  data,
}: {
  widget: WidgetPosition
  data: any[]
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    )
  }

  const columns = Object.keys(data[0])
  const displayColumns = columns.slice(0, 5) // Limit to 5 columns

  return (
    <div className="overflow-x-auto h-full">
      <table className="w-full text-sm border-collapse">
        <thead className="border-b border-border bg-muted sticky top-0">
          <tr>
            {displayColumns.map((col) => (
              <th
                key={col}
                className="text-left p-2 font-semibold text-foreground text-xs uppercase"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 20).map((row, idx) => (
            <tr key={idx} className="border-b border-border hover:bg-muted/30">
              {displayColumns.map((col) => (
                <td key={`${idx}-${col}`} className="p-2 text-foreground truncate">
                  {String(row[col]).slice(0, 50)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 20 && (
        <div className="p-2 text-xs text-muted-foreground bg-muted/30">
          Showing 20 of {data.length} rows
        </div>
      )}
    </div>
  )
}

function KPIWidget({
  widget,
  data,
}: {
  widget: WidgetPosition
  data: any[]
}) {
  const value = useMemo(() => {
    if (!data || data.length === 0) return 0
    const values = data.map((d) => parseFloat(d[widget.config.yAxis]) || 0)
    return values.reduce((a, b) => a + b, 0)
  }, [data, widget.config])

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-muted-foreground text-sm">{widget.config.yAxis || 'Value'}</p>
        <p className="text-4xl font-bold text-foreground">
          {value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  )
}

function MetricWidget({
  widget,
  data,
}: {
  widget: WidgetPosition
  data: any[]
}) {
  const value = useMemo(() => {
    if (!data || data.length === 0) return 0
    return data.length
  }, [data])

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-muted-foreground text-sm">Total Records</p>
        <p className="text-4xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  )
}

function ScatterPlotWidget({
  widget,
  data,
}: {
  widget: WidgetPosition
  data: any[]
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={widget.config.xAxis} name={widget.config.xAxis} />
        <YAxis dataKey={widget.config.yAxis} name={widget.config.yAxis} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter name={widget.name} data={data} fill={CHART_COLORS[0]} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

export function WidgetRenderer({ widget, data, isLoading }: WidgetRendererProps) {
  const renderChart = () => {
    switch (widget.type) {
      case 'bar':
        return <BarChartWidget widget={widget} data={data} />
      case 'line':
        return <LineChartWidget widget={widget} data={data} />
      case 'pie':
        return <PieChartWidget widget={widget} data={data} />
      case 'table':
        return <TableWidget widget={widget} data={data} />
      case 'kpi':
        return <KPIWidget widget={widget} data={data} />
      case 'metric':
        return <MetricWidget widget={widget} data={data} />
      case 'scatter':
        return <ScatterPlotWidget widget={widget} data={data} />
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Widget type not supported
          </div>
        )
    }
  }

  return (
    <Card className="bg-card border-border h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{widget.name}</CardTitle>
        {widget.config.yAxis && (
          <CardDescription className="text-xs">{widget.config.yAxis}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading...
          </div>
        ) : data && data.length > 0 ? (
          renderChart()
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  )
}
