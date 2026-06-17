import { useCallback, useEffect, useState } from 'react'

import { fetchMalfunctionAlerts, resolveMalfunctionAlert } from '../services/parkingApi'
import type { MalfunctionAlert, MalfunctionAlertPayload } from '../types'

interface MalfunctionAlertsPanelProps {
  liveAlert?: MalfunctionAlertPayload | null
}

export function MalfunctionAlertsPanel({ liveAlert }: MalfunctionAlertsPanelProps) {
  const [alerts, setAlerts] = useState<MalfunctionAlert[]>([])

  const loadAlerts = useCallback(async () => {
    try {
      const data = await fetchMalfunctionAlerts(true)
      setAlerts(data)
    } catch {
      setAlerts([])
    }
  }, [])

  useEffect(() => {
    void loadAlerts()
  }, [loadAlerts, liveAlert])

  async function handleResolve(alertId: string) {
    await resolveMalfunctionAlert(alertId)
    await loadAlerts()
  }

  if (alerts.length === 0) {
    return <p className="text-sm text-slate-500">No active malfunction alerts.</p>
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm"
        >
          <p className="font-medium text-amber-200">
            {alert.spot_number} ({alert.level_zone})
          </p>
          <p className="mt-1 text-amber-100/80">{alert.message}</p>
          <p className="mt-1 text-xs text-amber-200/60">
            {new Date(alert.created_at).toLocaleString()}
          </p>
          <button
            type="button"
            onClick={() => void handleResolve(alert.id)}
            className="mt-2 rounded-lg border border-amber-400/40 px-2 py-1 text-xs text-amber-200"
          >
            Mark Resolved
          </button>
        </div>
      ))}
    </div>
  )
}
