'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

type Props = {
  type: 'bar' | 'line' | 'pie'
  data: Record<string, unknown>[]
  columnMapping: { x?: string; y?: string; label?: string; value?: string }
  title: string
}

export function ChartWidget({ type, data, columnMapping }: Props) {
  const xLabel = columnMapping.x || 'Category'
  const yLabel = columnMapping.y || 'Value'

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 2, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={columnMapping.x} tick={{ fontSize: 11 }} label={{ value: xLabel, position: 'insideBottom', offset: -8 }} />
          <YAxis tick={{ fontSize: 11 }} label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Bar dataKey={columnMapping.y} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 2, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={columnMapping.x} tick={{ fontSize: 11 }} label={{ value: xLabel, position: 'insideBottom', offset: -8 }} />
          <YAxis tick={{ fontSize: 11 }} label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Line type="monotone" dataKey={columnMapping.y} stroke={COLORS[0]} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip />
        <Pie
          data={data}
          nameKey={columnMapping.label}
          dataKey={columnMapping.value}
          cx="50%"
          cy="50%"
          outerRadius={110}
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
