'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

export interface WidgetPosition {
  id: string
  x: number
  y: number
  width: number
  height: number
  type: 'bar' | 'line' | 'pie' | 'table' | 'kpi' | 'metric' | 'heatmap' | 'scatter'
  name: string
  datasetId: number | null
  config: Record<string, any>
}

interface DashboardBuilderContextType {
  dashboardId: number | null
  dashboardName: string
  dashboardDescription: string
  widgets: WidgetPosition[]
  selectedWidgetId: string | null
  theme: 'light' | 'dark'
  
  // Dashboard actions
  setDashboard: (id: number, name: string, description: string) => void
  setTheme: (theme: 'light' | 'dark') => void
  
  // Widget actions
  addWidget: (widget: WidgetPosition) => void
  updateWidget: (id: string, widget: Partial<WidgetPosition>) => void
  removeWidget: (id: string) => void
  selectWidget: (id: string | null) => void
  duplicateWidget: (id: string) => void
  
  // Layout actions
  updateLayout: (id: string, x: number, y: number, width: number, height: number) => void
  resetLayout: () => void
}

const DashboardBuilderContext = createContext<DashboardBuilderContextType | undefined>(undefined)

export function DashboardBuilderProvider({ children }: { children: React.ReactNode }) {
  const [dashboardId, setDashboardId] = useState<number | null>(null)
  const [dashboardName, setDashboardName] = useState('')
  const [dashboardDescription, setDashboardDescription] = useState('')
  const [widgets, setWidgets] = useState<WidgetPosition[]>([])
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null)
  const [theme, setThemeState] = useState<'light' | 'dark'>('light')

  const setDashboard = useCallback((id: number, name: string, description: string) => {
    setDashboardId(id)
    setDashboardName(name)
    setDashboardDescription(description)
  }, [])

  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setThemeState(newTheme)
  }, [])

  const addWidget = useCallback((widget: WidgetPosition) => {
    setWidgets((prev) => [...prev, widget])
  }, [])

  const updateWidget = useCallback((id: string, updates: Partial<WidgetPosition>) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    )
  }, [])

  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id))
    if (selectedWidgetId === id) {
      setSelectedWidgetId(null)
    }
  }, [selectedWidgetId])

  const selectWidget = useCallback((id: string | null) => {
    setSelectedWidgetId(id)
  }, [])

  const duplicateWidget = useCallback((id: string) => {
    const widget = widgets.find((w) => w.id === id)
    if (widget) {
      const newWidget = {
        ...widget,
        id: `widget-${Date.now()}`,
        x: widget.x + 1,
        y: widget.y + 1,
      }
      addWidget(newWidget)
    }
  }, [widgets, addWidget])

  const updateLayout = useCallback(
    (id: string, x: number, y: number, width: number, height: number) => {
      updateWidget(id, { x, y, width, height })
    },
    [updateWidget]
  )

  const resetLayout = useCallback(() => {
    setWidgets([])
    setSelectedWidgetId(null)
  }, [])

  return (
    <DashboardBuilderContext.Provider
      value={{
        dashboardId,
        dashboardName,
        dashboardDescription,
        widgets,
        selectedWidgetId,
        theme,
        setDashboard,
        setTheme,
        addWidget,
        updateWidget,
        removeWidget,
        selectWidget,
        duplicateWidget,
        updateLayout,
        resetLayout,
      }}
    >
      {children}
    </DashboardBuilderContext.Provider>
  )
}

export function useDashboardBuilder() {
  const context = useContext(DashboardBuilderContext)
  if (context === undefined) {
    throw new Error('useDashboardBuilder must be used within DashboardBuilderProvider')
  }
  return context
}
