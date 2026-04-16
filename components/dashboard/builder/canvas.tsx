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
          x: e.clientX - rect.left - widget.x * 50,
          y: e.clientY - rect.top - widget.y * 50,
        })
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingWidget && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const newX = Math.max(0, Math.round((e.clientX - rect.left - dragOffset.x) / 50))
      const newY = Math.max(0, Math.round((e.clientY - rect.top - dragOffset.y) / 50))

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
    <Card className="bg-muted/20 border-border relative overflow-hidden flex-1">
      <div
        ref={canvasRef}
        className="relative w-full h-full bg-background"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
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
            <div className="text-center">
              <p className="text-muted-foreground">
                No widgets yet. Add one from the toolbar to get started.
              </p>
            </div>
          </div>
        )}

        {/* Coordinates display */}
        {selectedWidgetId && (
          <div className="absolute top-4 right-4 bg-card border border-border rounded px-3 py-2 text-xs text-muted-foreground">
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
