import { useCallback, useEffect, useState } from 'react'

import { FinancialReportCards } from '../components/FinancialReportCards'
import { IoTSimulator } from '../components/IoTSimulator'
import { Layout } from '../components/Layout'
import { MalfunctionAlertsPanel } from '../components/MalfunctionAlertsPanel'
import { UserManagementPanel } from '../components/UserManagementPanel'
import { spotStatusStyles, useSpotWebSocket } from '../hooks/useSpotWebSocket'
import {
  createSpot,
  fetchCachedOccupancyReport,
  fetchFinancialReport,
  fetchOccupancyReport,
  fetchSpots,
  updateSpot,
} from '../services/parkingApi'
import type { DailyOccupancyReport, FinancialReportResponse, ParkingSpot, SpotStatus } from '../types'

export function ManagementDashboard() {
  const [initialSpots, setInitialSpots] = useState<ParkingSpot[]>([])
  const [report, setReport] = useState<DailyOccupancyReport | null>(null)
  const [financialReport, setFinancialReport] = useState<FinancialReportResponse | null>(null)
  const [cacheInfo, setCacheInfo] = useState<string | null>(null)
  const [spotNumber, setSpotNumber] = useState('')
  const [levelZone, setLevelZone] = useState('Level-C')
  const [message, setMessage] = useState<string | null>(null)
  const [editDrafts, setEditDrafts] = useState<
    Record<string, { spot_number: string; level_zone: string }>
  >({})

  const loadData = useCallback(async () => {
    try {
      const spots = await fetchSpots()
      setInitialSpots(spots)
      setEditDrafts(
        Object.fromEntries(
          spots.map((spot) => [
            spot.id,
            { spot_number: spot.spot_number, level_zone: spot.level_zone },
          ]),
        ),
      )
    } catch {
      setMessage('Unable to load parking spots from the API.')
      setInitialSpots([])
    }

    try {
      const liveReport = await fetchOccupancyReport()
      setReport(liveReport)
    } catch {
      setReport(null)
    }

    try {
      const cached = await fetchCachedOccupancyReport()
      setCacheInfo(cached.cache_key)
      setReport(cached.report)
    } catch {
      setCacheInfo(null)
    }

    try {
      const financial = await fetchFinancialReport()
      setFinancialReport(financial)
    } catch {
      setFinancialReport(null)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const { spots, connectionLabel, lastMalfunctionAlert } = useSpotWebSocket(initialSpots)

  async function handleCreateSpot(event: React.FormEvent) {
    event.preventDefault()
    setMessage(null)

    try {
      await createSpot({ spot_number: spotNumber, level_zone: levelZone })
      setSpotNumber('')
      setMessage('Spot created successfully.')
      await loadData()
    } catch {
      setMessage('Unable to create spot.')
    }
  }

  async function handleStatusChange(spotId: string, status: SpotStatus) {
    setMessage(null)

    try {
      await updateSpot(spotId, { status })
      setMessage(`Spot updated to ${status}.`)
      await loadData()
    } catch {
      setMessage('Unable to update spot.')
    }
  }

  async function handleSpotMetaSave(spotId: string) {
    const draft = editDrafts[spotId]
    if (!draft) return

    setMessage(null)
    try {
      await updateSpot(spotId, {
        spot_number: draft.spot_number,
        level_zone: draft.level_zone,
      })
      setMessage('Spot details updated.')
      await loadData()
    } catch {
      setMessage('Unable to update spot details.')
    }
  }

  return (
    <Layout title="Management Dashboard">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Operations</p>
              <h2 className="text-xl font-semibold text-white">Spot Management</h2>
            </div>
            <span className="text-sm text-cyan-300">WebSocket: {connectionLabel}</span>
          </div>

          <form
            onSubmit={(event) => void handleCreateSpot(event)}
            className="mt-6 grid gap-4 md:grid-cols-3"
          >
            <input
              value={spotNumber}
              onChange={(event) => setSpotNumber(event.target.value)}
              placeholder="Spot number"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
              required
            />
            <input
              value={levelZone}
              onChange={(event) => setLevelZone(event.target.value)}
              placeholder="Level zone"
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
              required
            />
            <button
              type="submit"
              className="rounded-xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 hover:bg-cyan-400"
            >
              Add Spot
            </button>
          </form>

          {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}

          <div className="mt-6 space-y-3">
            {spots.map((spot) => (
              <div
                key={spot.id}
                className={`rounded-xl border px-4 py-3 ${spotStatusStyles(spot.status)}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="grid flex-1 gap-2 sm:grid-cols-2">
                    <input
                      value={editDrafts[spot.id]?.spot_number ?? spot.spot_number}
                      onChange={(event) =>
                        setEditDrafts((current) => ({
                          ...current,
                          [spot.id]: {
                            ...current[spot.id],
                            spot_number: event.target.value,
                          },
                        }))
                      }
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                    />
                    <input
                      value={editDrafts[spot.id]?.level_zone ?? spot.level_zone}
                      onChange={(event) =>
                        setEditDrafts((current) => ({
                          ...current,
                          [spot.id]: {
                            ...current[spot.id],
                            level_zone: event.target.value,
                          },
                        }))
                      }
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSpotMetaSave(spot.id)}
                      className="rounded-lg border border-cyan-500/40 px-2 py-1 text-xs text-cyan-300"
                    >
                      Save
                    </button>
                    <select
                      value={spot.status}
                      onChange={(event) =>
                        void handleStatusChange(spot.id, event.target.value as SpotStatus)
                      }
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="RESERVED">RESERVED</option>
                      <option value="OCCUPIED">OCCUPIED</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm text-slate-400">Users</p>
            <h2 className="text-xl font-semibold text-white">User Management</h2>
            <div className="mt-4">
              <UserManagementPanel />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm text-slate-400">IoT</p>
            <h2 className="text-xl font-semibold text-white">Malfunction Alerts</h2>
            <div className="mt-4">
              <MalfunctionAlertsPanel liveAlert={lastMalfunctionAlert} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm text-slate-400">Revenue</p>
            <h2 className="text-xl font-semibold text-white">Financial Report</h2>
            <div className="mt-6">
              <FinancialReportCards report={financialReport} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm text-slate-400">Analytics</p>
            <h2 className="text-xl font-semibold text-white">Occupancy Report</h2>
            {cacheInfo ? <p className="mt-2 text-xs text-violet-300">Cached: {cacheInfo}</p> : null}

            {report ? (
              <div className="mt-6 space-y-4 text-sm text-slate-300">
                <div className="rounded-xl bg-slate-950 p-4">
                  <p>Report date: {report.report_date}</p>
                  <p className="mt-2">Total spots: {report.total_spots}</p>
                  <p className="mt-2">
                    Average utilization: {(report.average_utilization_rate * 100).toFixed(1)}%
                  </p>
                  <p className="mt-2">
                    Peak hour: {report.peak_hour ?? 'N/A'} (
                    {(report.peak_utilization_rate * 100).toFixed(1)}%)
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-6 text-slate-400">No report available yet.</p>
            )}
          </section>
        </div>
      </div>

      <IoTSimulator spots={spots} />
    </Layout>
  )
}
