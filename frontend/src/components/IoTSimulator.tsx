import { useMemo, useState } from 'react'

import { ingestSensorReading } from '../services/parkingApi'
import type { ParkingSpot, SensorState } from '../types'

interface IoTSimulatorProps {
  spots: ParkingSpot[]
}

export function IoTSimulator({ spots }: IoTSimulatorProps) {
  const [open, setOpen] = useState(false)
  const [spotId, setSpotId] = useState('')
  const [sensorState, setSensorState] = useState<SensorState>('DETECTED')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const sortedSpots = useMemo(
    () => [...spots].sort((a, b) => a.spot_number.localeCompare(b.spot_number)),
    [spots],
  )

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!spotId) return

    setLoading(true)
    setMessage(null)

    try {
      const response = await ingestSensorReading({ spot_id: spotId, sensor_state: sensorState })
      setMessage(`Queued task ${response.task_id}. Watch the grid update live.`)
    } catch {
      setMessage('Sensor ingest failed. Check API key and backend status.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-violet-500 px-5 py-3 font-medium text-white shadow-lg shadow-violet-500/30 hover:bg-violet-400"
      >
        IoT Simulator
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/70 p-6 backdrop-blur-sm">
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="w-full max-w-md rounded-2xl border border-violet-500/30 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-violet-300">Hardware Emulator</p>
                <h2 className="text-xl font-semibold text-white">Sensor Ingest</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400">
                Close
              </button>
            </div>

            <label className="mt-4 block text-sm text-slate-300">
              Spot
              <select
                value={spotId}
                onChange={(event) => setSpotId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              >
                <option value="">Select a spot</option>
                {sortedSpots.map((spot) => (
                  <option key={spot.id} value={spot.id}>
                    {spot.spot_number} ({spot.status})
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm text-slate-300">
              Sensor State
              <select
                value={sensorState}
                onChange={(event) => setSensorState(event.target.value as SensorState)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              >
                <option value="DETECTED">DETECTED (vehicle present)</option>
                <option value="CLEAR">CLEAR (spot empty)</option>
                <option value="FAULT">FAULT</option>
              </select>
            </label>

            {message ? <p className="mt-4 text-sm text-violet-200">{message}</p> : null}

            <button
              type="submit"
              disabled={loading || !spotId}
              className="mt-6 w-full rounded-xl bg-violet-500 px-4 py-3 font-medium text-white hover:bg-violet-400 disabled:opacity-60"
            >
              Send to /sensors/ingest
            </button>
          </form>
        </div>
      ) : null}
    </>
  )
}
