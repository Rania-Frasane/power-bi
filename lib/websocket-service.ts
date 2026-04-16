/**
 * WebSocket service for real-time dashboard updates
 */

export interface WebSocketMessage {
  type: 'data_update' | 'dashboard_change' | 'widget_update' | 'share_change' | 'error'
  payload: any
  timestamp: number
}

export interface DataUpdateMessage extends WebSocketMessage {
  type: 'data_update'
  payload: {
    datasetId: number
    data: any[]
    count: number
  }
}

export interface WidgetUpdateMessage extends WebSocketMessage {
  type: 'widget_update'
  payload: {
    widgetId: number
    config: any
    position: { x: number; y: number }
  }
}

export type MessageHandler = (message: WebSocketMessage) => void

export class DashboardWebSocket {
  private ws: WebSocket | null = null
  private url: string
  private dashboardId: number
  private accessToken: string
  private messageHandlers: Set<MessageHandler> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private reconnectTimer: NodeJS.Timeout | null = null
  private isManuallyDisconnected = false

  constructor(dashboardId: number, accessToken: string) {
    this.dashboardId = dashboardId
    this.accessToken = accessToken
    // Convert http to ws, https to wss
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws'
    const wsUrl = baseUrl
      .replace(/^https?:/, wsProtocol + ':')
      .replace(/\/$/, '')
    this.url = `${wsUrl}/ws/dashboards/${dashboardId}/`
  }

  /**
   * Connect to WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected to dashboard:', this.dashboardId)
          this.reconnectAttempts = 0
          // Send auth token
          this.send({ type: 'auth', token: this.accessToken })
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage
            this.handleMessage(message)
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error)
          }
        }

        this.ws.onerror = (event) => {
          console.error('[WebSocket] Error:', event)
          reject(new Error('WebSocket connection failed'))
        }

        this.ws.onclose = () => {
          console.log('[WebSocket] Disconnected')
          this.ws = null
          // Auto-reconnect if not manually disconnected
          if (!this.isManuallyDisconnected) {
            this.attemptReconnect()
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.isManuallyDisconnected = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * Send message to server
   */
  send(data: any): void {
    if (!this.isConnected()) {
      console.warn('[WebSocket] Not connected, cannot send message')
      return
    }
    try {
      this.ws!.send(JSON.stringify(data))
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error)
    }
  }

  /**
   * Subscribe to messages
   */
  subscribe(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    // Return unsubscribe function
    return () => this.messageHandlers.delete(handler)
  }

  /**
   * Subscribe to specific message type
   */
  subscribeToType(
    type: WebSocketMessage['type'],
    handler: MessageHandler
  ): () => void {
    const wrappedHandler = (message: WebSocketMessage) => {
      if (message.type === type) {
        handler(message)
      }
    }
    return this.subscribe(wrappedHandler)
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * Get connection status
   */
  getStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (!this.ws) return 'disconnected'
    switch (this.ws.readyState) {
      case WebSocket.OPEN:
        return 'connected'
      case WebSocket.CONNECTING:
        return 'connecting'
      default:
        return 'disconnected'
    }
  }

  /**
   * Request data update for a dataset
   */
  requestDataUpdate(datasetId: number): void {
    this.send({
      type: 'request_update',
      dataset_id: datasetId,
    })
  }

  /**
   * Request widget configuration update
   */
  requestWidgetUpdate(widgetId: number): void {
    this.send({
      type: 'request_widget_update',
      widget_id: widgetId,
    })
  }

  /**
   * Broadcast widget change to other users
   */
  broadcastWidgetChange(widgetId: number, config: any): void {
    this.send({
      type: 'widget_change',
      widget_id: widgetId,
      config,
    })
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: WebSocketMessage): void {
    // Notify all subscribers
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message)
      } catch (error) {
        console.error('[WebSocket] Handler error:', error)
      }
    })
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    console.log(
      `[WebSocket] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
    )

    this.reconnectTimer = setTimeout(() => {
      this.isManuallyDisconnected = false
      this.connect().catch((error) => {
        console.error('[WebSocket] Reconnection failed:', error)
      })
    }, delay)
  }
}

/**
 * Global WebSocket instance manager
 */
class WebSocketManager {
  private instances: Map<number, DashboardWebSocket> = new Map()

  getOrCreate(dashboardId: number, accessToken: string): DashboardWebSocket {
    if (!this.instances.has(dashboardId)) {
      this.instances.set(dashboardId, new DashboardWebSocket(dashboardId, accessToken))
    }
    return this.instances.get(dashboardId)!
  }

  disconnect(dashboardId: number): void {
    const instance = this.instances.get(dashboardId)
    if (instance) {
      instance.disconnect()
      this.instances.delete(dashboardId)
    }
  }

  disconnectAll(): void {
    this.instances.forEach((instance) => instance.disconnect())
    this.instances.clear()
  }
}

export const wsManager = new WebSocketManager()
