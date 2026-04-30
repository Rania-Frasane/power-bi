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
  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={columnMapping.x} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={columnMapping.y} fill={COLORS[0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={columnMapping.x} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey={columnMapping.y} stroke={COLORS[0]} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
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
