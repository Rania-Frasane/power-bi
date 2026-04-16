'use client'

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { FilterValue } from '@/components/dashboard/viewer/filter-bar'

interface DashboardViewerContextType {
  filters: FilterValue[]
  widgetData: Record<number, any[]>
  loadingWidgets: Set<number>
  
  // Filter actions
  addFilter: (filter: FilterValue) => void
  updateFilter: (filterId: string, value: string | number | null) => void
  removeFilter: (filterId: string) => void
  
  // Widget data actions
  setWidgetData: (widgetId: number, data: any[]) => void
  setWidgetLoading: (widgetId: number, isLoading: boolean) => void
  getFilteredData: (data: any[], datasetId: number) => any[]
}

const DashboardViewerContext = createContext<DashboardViewerContextType | undefined>(undefined)

export function DashboardViewerProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterValue[]>([])
  const [widgetData, setWidgetDataState] = useState<Record<number, any[]>>({})
  const [loadingWidgets, setLoadingWidgets] = useState<Set<number>>(new Set())

  const addFilter = useCallback((filter: FilterValue) => {
    setFilters((prev) => [...prev, filter])
  }, [])

  const updateFilter = useCallback((filterId: string, value: string | number | null) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === filterId ? { ...f, value } : f))
    )
  }, [])

  const removeFilter = useCallback((filterId: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== filterId))
  }, [])

  const setWidgetData = useCallback((widgetId: number, data: any[]) => {
    setWidgetDataState((prev) => ({
      ...prev,
      [widgetId]: data,
    }))
  }, [])

  const setWidgetLoading = useCallback((widgetId: number, isLoading: boolean) => {
    setLoadingWidgets((prev) => {
      const newSet = new Set(prev)
      if (isLoading) {
        newSet.add(widgetId)
      } else {
        newSet.delete(widgetId)
      }
      return newSet
    })
  }, [])

  const getFilteredData = useCallback(
    (data: any[], datasetId: number) => {
      if (filters.length === 0 || !data) return data

      // Apply all active filters
      return data.filter((row) => {
        return filters
          .filter((f) => f.value !== null && f.value !== '')
          .every((filter) => {
            const cellValue = String(row[filter.column]).toLowerCase()
            const filterValue = String(filter.value).toLowerCase()

            switch (filter.type) {
              case 'text':
                return cellValue.includes(filterValue)
              case 'number':
                return parseFloat(cellValue) === parseFloat(filterValue)
              case 'select':
                return cellValue === filterValue
              case 'date':
                return cellValue.startsWith(filterValue)
              default:
                return true
            }
          })
      })
    },
    [filters]
  )

  return (
    <DashboardViewerContext.Provider
      value={{
        filters,
        widgetData,
        loadingWidgets,
        addFilter,
        updateFilter,
        removeFilter,
        setWidgetData,
        setWidgetLoading,
        getFilteredData,
      }}
    >
      {children}
    </DashboardViewerContext.Provider>
  )
}

export function useDashboardViewer() {
  const context = useContext(DashboardViewerContext)
  if (context === undefined) {
    throw new Error('useDashboardViewer must be used within DashboardViewerProvider')
  }
  return context
}
