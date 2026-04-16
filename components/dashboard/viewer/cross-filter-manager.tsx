'use client'

import { useState, useCallback } from 'react'

export interface CrossFilterSelection {
  widgetId: string
  column: string
  value: string | number
  timestamp: number
}

interface CrossFilterManagerProps {
  onFilterSelect?: (selection: CrossFilterSelection) => void
  onFilterClear?: () => void
}

/**
 * Cross-filter manager handles selections from one widget affecting others
 */
export function useCrossFilterManager() {
  const [activeFilter, setActiveFilter] = useState<CrossFilterSelection | null>(null)

  const selectValue = useCallback(
    (widgetId: string, column: string, value: string | number) => {
      const selection: CrossFilterSelection = {
        widgetId,
        column,
        value,
        timestamp: Date.now(),
      }
      setActiveFilter(selection)
    },
    []
  )

  const clearFilter = useCallback(() => {
    setActiveFilter(null)
  }, [])

  const isSelected = useCallback(
    (column: string, value: string | number): boolean => {
      return activeFilter?.column === column && activeFilter?.value === value
    },
    [activeFilter]
  )

  const applyFilter = useCallback(
    (data: any[], filterColumn: string): any[] => {
      if (!activeFilter || activeFilter.column !== filterColumn) {
        return data
      }

      return data.filter((row) => {
        const cellValue = String(row[filterColumn]).toLowerCase()
        const filterValue = String(activeFilter.value).toLowerCase()
        return cellValue === filterValue
      })
    },
    [activeFilter]
  )

  return {
    activeFilter,
    selectValue,
    clearFilter,
    isSelected,
    applyFilter,
  }
}

/**
 * Component to enable cross-filtering in bar/pie/table charts
 */
export interface CrossFilterable {
  widgetId: string
  onValueClick?: (column: string, value: string | number) => void
}

/**
 * Utility to add cross-filtering to chart elements
 */
export function makeCrossFilterable(
  element: HTMLElement,
  widgetId: string,
  column: string,
  value: string | number,
  onSelect: (widgetId: string, column: string, value: string | number) => void
): void {
  element.style.cursor = 'pointer'
  element.addEventListener('click', () => {
    onSelect(widgetId, column, value)
  })
  element.addEventListener('mouseenter', () => {
    element.style.opacity = '0.8'
  })
  element.addEventListener('mouseleave', () => {
    element.style.opacity = '1'
  })
}

/**
 * Broadcast cross-filter selection across dashboard
 */
export class CrossFilterBroadcaster {
  private listeners: Set<(selection: CrossFilterSelection | null) => void> = new Set()

  subscribe(listener: (selection: CrossFilterSelection | null) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  broadcast(selection: CrossFilterSelection | null): void {
    this.listeners.forEach((listener) => listener(selection))
  }

  clear(): void {
    this.broadcast(null)
  }
}

// Singleton instance for dashboard-wide broadcasting
export const crossFilterBroadcaster = new CrossFilterBroadcaster()
