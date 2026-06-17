import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  BookingReceiptPayload,
  CancellationNotificationPayload,
  DriverNotificationPayload,
  MalfunctionAlertPayload,
  ParkingSpot,
  RefundNotificationPayload,
  SpotUpdatePayload,
} from '../types'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws/v1/spots/updates'

type ConnectionState = 'connecting' | 'live' | 'offline'

function isSpotUpdate(payload: unknown): payload is SpotUpdatePayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'spot_id' in payload &&
    !('event_type' in payload)
  )
}

function isDriverNotification(payload: unknown): payload is DriverNotificationPayload {
  if (typeof payload !== 'object' || payload === null || !('event_type' in payload)) {
    return false
  }
  const eventType = (payload as { event_type: unknown }).event_type
  return (
    eventType === 'PAYMENT_SUCCESS' ||
    eventType === 'CANCELLATION_SUCCESS' ||
    eventType === 'REFUND_SUCCESS'
  )
}

function isMalfunctionAlert(payload: unknown): payload is MalfunctionAlertPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'event_type' in payload &&
    (payload as { event_type: unknown }).event_type === 'MALFUNCTION_ALERT'
  )
}

function mergeSpotUpdate(spots: ParkingSpot[], update: SpotUpdatePayload): ParkingSpot[] {
  const index = spots.findIndex((spot) => spot.id === update.spot_id)
  const nextSpot: ParkingSpot = {
    id: update.spot_id,
    spot_number: update.spot_number,
    level_zone: update.level_zone,
    status: update.status,
    last_updated: update.last_updated,
  }

  if (index === -1) {
    return [...spots, nextSpot]
  }

  const next = [...spots]
  next[index] = nextSpot
  return next
}

export function useSpotWebSocket(initialSpots: ParkingSpot[], userId?: string) {
  const [spots, setSpots] = useState<ParkingSpot[]>(initialSpots)
  const [lastUpdate, setLastUpdate] = useState<SpotUpdatePayload | null>(null)
  const [lastPaymentNotification, setLastPaymentNotification] =
    useState<BookingReceiptPayload | null>(null)
  const [lastCancellationNotification, setLastCancellationNotification] =
    useState<CancellationNotificationPayload | null>(null)
  const [lastRefundNotification, setLastRefundNotification] =
    useState<RefundNotificationPayload | null>(null)
  const [lastMalfunctionAlert, setLastMalfunctionAlert] =
    useState<MalfunctionAlertPayload | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const reconnectAttempts = useRef(0)
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<number | null>(null)
  const heartbeatTimer = useRef<number | null>(null)

  useEffect(() => {
    setSpots(initialSpots)
  }, [initialSpots])

  const clearPaymentNotification = useCallback(() => {
    setLastPaymentNotification(null)
  }, [])

  const clearCancellationNotification = useCallback(() => {
    setLastCancellationNotification(null)
  }, [])

  const clearRefundNotification = useCallback(() => {
    setLastRefundNotification(null)
  }, [])

  const handleMessage = useCallback(
    (raw: string) => {
      try {
        const payload: unknown = JSON.parse(raw)

        if (isMalfunctionAlert(payload)) {
          setLastMalfunctionAlert(payload)
          return
        }

        if (isDriverNotification(payload)) {
          if (userId && payload.user_id !== userId) {
            return
          }
          if (payload.event_type === 'PAYMENT_SUCCESS') {
            setLastPaymentNotification(payload)
          } else if (payload.event_type === 'CANCELLATION_SUCCESS') {
            setLastCancellationNotification(payload)
          } else if (payload.event_type === 'REFUND_SUCCESS') {
            setLastRefundNotification(payload)
          }
          return
        }

        if (isSpotUpdate(payload)) {
          setLastUpdate(payload)
          setSpots((current) => mergeSpotUpdate(current, payload))
        }
      } catch {
        // Ignore malformed websocket payloads.
      }
    },
    [userId],
  )

  useEffect(() => {
    let cancelled = false

    function clearTimers() {
      if (reconnectTimer.current !== null) {
        window.clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
      if (heartbeatTimer.current !== null) {
        window.clearInterval(heartbeatTimer.current)
        heartbeatTimer.current = null
      }
    }

    function scheduleReconnect() {
      if (cancelled || reconnectAttempts.current >= 20) {
        setConnectionState('offline')
        return
      }

      reconnectAttempts.current += 1
      setConnectionState('connecting')
      reconnectTimer.current = window.setTimeout(connect, 3000)
    }

    function connect() {
      if (cancelled) return

      clearTimers()
      setConnectionState('connecting')

      const socket = new WebSocket(WS_URL)
      socketRef.current = socket

      socket.onopen = () => {
        if (cancelled) return
        reconnectAttempts.current = 0
        setConnectionState('live')

        heartbeatTimer.current = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send('ping')
          }
        }, 25000)
      }

      socket.onmessage = (event) => {
        if (typeof event.data === 'string') {
          handleMessage(event.data)
        }
      }

      socket.onerror = () => {
        if (!cancelled) {
          setConnectionState('offline')
        }
      }

      socket.onclose = () => {
        if (cancelled) return
        clearTimers()
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      cancelled = true
      clearTimers()
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [handleMessage])

  const connectionLabel =
    connectionState === 'live' ? 'Live' : connectionState === 'connecting' ? 'Connecting' : 'Offline'

  return {
    spots,
    setSpots,
    lastUpdate,
    lastPaymentNotification,
    lastCancellationNotification,
    lastRefundNotification,
    lastMalfunctionAlert,
    clearPaymentNotification,
    clearCancellationNotification,
    clearRefundNotification,
    connectionLabel,
    isConnected: connectionState === 'live',
  }
}

export function spotStatusStyles(status: ParkingSpot['status']) {
  switch (status) {
    case 'AVAILABLE':
      return 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
    case 'RESERVED':
      return 'border-amber-500/60 bg-amber-500/10 text-amber-300'
    case 'OCCUPIED':
      return 'border-rose-500/60 bg-rose-500/10 text-rose-300'
    case 'MAINTENANCE':
      return 'border-slate-500/60 bg-slate-500/10 text-slate-300'
    default:
      return 'border-slate-700 bg-slate-900 text-slate-300'
  }
}

export function paymentStatusStyles(status: string) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    case 'PENDING':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    case 'FAILED':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    case 'REFUNDED':
      return 'bg-violet-500/15 text-violet-300 border-violet-500/30'
    default:
      return 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  }
}
