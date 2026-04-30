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

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#14b8a6',
  '#f97316',
]

type Props = {
  type: 'bar' | 'line' | 'pie'
  data: Record<string, unknown>[]
  columnMapping: { x?: string; y?: string; label?: string; value?: string }
  title: string
  color?: string
  colorMode?: 'dynamic' | 'custom'
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const num = Number.parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function ChartWidget({
  type,
  data,
  columnMapping,
  color = '#3b82f6',
  colorMode = 'dynamic',
}: Props) {
  const xLabel = columnMapping.x || 'Category'
  const yLabel = columnMapping.y || 'Value'
  const numericValues =
    (columnMapping.y
      ? data.map((d) => Number(d[columnMapping.y] ?? 0)).filter((v) => Number.isFinite(v))
      : []) || []
  const maxValue =
    numericValues.length > 0 ? Math.max(...numericValues) : 1

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 2, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={columnMapping.x} tick={{ fontSize: 11 }} label={{ value: xLabel, position: 'insideBottom', offset: -8 }} />
          <YAxis tick={{ fontSize: 11 }} label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Bar dataKey={columnMapping.y} radius={[4, 4, 0, 0]}>
            {data.map((entry, idx) => {
              const raw = Number(entry[columnMapping.y || ''] ?? 0)
              const ratio = maxValue > 0 ? raw / maxValue : 0
              if (colorMode === 'custom') {
                return <Cell key={idx} fill={withAlpha(color, 0.35 + ratio * 0.65)} />
              }
              const colorIndex = Math.min(COLORS.length - 1, Math.floor(ratio * COLORS.length))
              return <Cell key={idx} fill={COLORS[colorIndex]} />
            })}
          </Bar>
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
          <Line
            type="monotone"
            dataKey={columnMapping.y}
            stroke={colorMode === 'custom' ? color : COLORS[0]}
            strokeWidth={2.5}
            dot={{ r: 2, fill: colorMode === 'custom' ? withAlpha(color, 0.8) : COLORS[2] }}
            activeDot={{ r: 5, fill: colorMode === 'custom' ? color : COLORS[4] }}
          />
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
            <Cell
              key={idx}
              fill={
                colorMode === 'custom'
                  ? withAlpha(color, 0.35 + ((idx % 6) + 1) * 0.1)
                  : COLORS[idx % COLORS.length]
              }
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
