'use client'

import { useRef, useState, useEffect } from 'react'
import { useDashboardBuilder, WidgetPosition } from '@/lib/dashboard-builder-context'
import { WidgetCard } from './widget-card'
import { Card } from '@/components/ui/card'

interface DashboardCanvasProps {
  onWidgetEdit: () => void
  canvasWidth?: number
  canvasHeight?: number
}

const GRID_SIZE = 60

export function DashboardCanvas({ onWidgetEdit, canvasWidth = 1200, canvasHeight = 800 }: DashboardCanvasProps) {
  const { widgets, selectWidget, selectedWidgetId, updateLayout } = useDashboardBuilder()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [draggingWidget, setDraggingWidget] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent, widgetId: string) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const widget = widgets.find((w) => w.id === widgetId)
      if (widget) {
        setDraggingWidget(widgetId)
        setDragOffset({
          x: e.clientX - rect.left - widget.x * GRID_SIZE,
          y: e.clientY - rect.top - widget.y * GRID_SIZE,
        })
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingWidget && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const newX = Math.max(0, Math.round((e.clientX - rect.left - dragOffset.x) / GRID_SIZE))
      const newY = Math.max(0, Math.round((e.clientY - rect.top - dragOffset.y) / GRID_SIZE))

      const widget = widgets.find((w) => w.id === draggingWidget)
      if (widget) {
        updateLayout(draggingWidget, newX, newY, widget.width, widget.height)
      }
    }
  }

  const handleMouseUp = () => {
    setDraggingWidget(null)
  }

  useEffect(() => {
    if (draggingWidget) {
      document.addEventListener('mousemove', handleMouseMove as any)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove as any)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggingWidget, dragOffset, widgets])

  return (
    <Card className="relative flex-1 overflow-hidden rounded-xl border-border bg-card shadow-sm">
      <div
        ref={canvasRef}
        className="relative h-full w-full bg-background"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border) / 0.55) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border) / 0.55) 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        }}
        onMouseLeave={handleMouseUp}
      >
        {/* Widgets */}
        {widgets.map((widget) => (
          <div
            key={widget.id}
            onMouseDown={(e) => {
              selectWidget(widget.id)
              handleMouseDown(e, widget.id)
            }}
            className="cursor-grab active:cursor-grabbing"
          >
            <WidgetCard
              widget={widget}
              isSelected={selectedWidgetId === widget.id}
              onSelect={() => selectWidget(widget.id)}
              onEdit={onWidgetEdit}
            />
          </div>
        ))}

        {/* Empty state */}
        {widgets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg border border-dashed border-border bg-background/80 px-6 py-5 text-center shadow-sm">
              <p className="font-medium text-foreground">
                No widgets yet. Add one from the toolbar to get started.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tip: start with KPI + Line + Bar for a balanced analytics view.
              </p>
            </div>
          </div>
        )}

        {/* Coordinates display */}
        {selectedWidgetId && (
          <div className="absolute right-4 top-4 rounded-md border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
            {(() => {
              const w = widgets.find((x) => x.id === selectedWidgetId)
              return w
                ? `x: ${w.x}, y: ${w.y} | w: ${w.width}, h: ${w.height}`
                : ''
            })()}
          </div>
        )}
      </div>
    </Card>
  )
}
