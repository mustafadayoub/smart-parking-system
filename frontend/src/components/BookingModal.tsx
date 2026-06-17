import axios from 'axios'
import { useMemo, useState } from 'react'

import { useAuth } from '../hooks/useAuth'
import { cancelReservation, createReservation } from '../services/parkingApi'
import type { ParkingSpot, Reservation } from '../types'

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') {
      return detail
    }
  }
  return fallback
}

function defaultStartTime() {
  const start = new Date()
  start.setMinutes(start.getMinutes() + 5)
  return start.toISOString().slice(0, 16)
}

function defaultEndTime() {
  const end = new Date()
  end.setMinutes(end.getMinutes() + 5)
  end.setHours(end.getHours() + 2)
  return end.toISOString().slice(0, 16)
}

interface BookingModalProps {
  spot: ParkingSpot | null
  reservations: Reservation[]
  onClose: () => void
  onChanged: () => void
  onBooked: (reservation: Reservation) => void
}

export function BookingModal({
  spot,
  reservations,
  onClose,
  onChanged,
  onBooked,
}: BookingModalProps) {
  const { user } = useAuth()
  const [driverName, setDriverName] = useState(user?.full_name ?? '')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [startTime, setStartTime] = useState(defaultStartTime)
  const [endTime, setEndTime] = useState(defaultEndTime)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const activeReservation = useMemo(
    () => reservations.find((item) => item.spot_id === spot?.id && item.status === 'ACTIVE'),
    [reservations, spot?.id],
  )

  if (!spot) {
    return null
  }

  async function handleBook() {
    if (!spot) return

    setLoading(true)
    setError(null)

    try {
      const reservation = await createReservation({
        spot_id: spot.id,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        vehicle_plate: vehiclePlate.trim(),
      })
      onChanged()
      onClose()
      onBooked(reservation)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create reservation'))
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!activeReservation) return

    setLoading(true)
    setError(null)

    try {
      await cancelReservation(activeReservation.id)
      onChanged()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to cancel reservation'))
    } finally {
      setLoading(false)
    }
  }

  const canBook = spot.status === 'AVAILABLE'
  const durationHours =
    (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60)
  const estimatedTotal = Math.max(durationHours, 0) * 5

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-cyan-400">Spot Details</p>
            <h2 className="text-2xl font-semibold text-white">{spot.spot_number}</h2>
            <p className="text-slate-400">{spot.level_zone}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            Close
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-slate-950 p-4 text-sm text-slate-300">
          <p>
            Status: <span className="font-medium text-white">{spot.status}</span>
          </p>
          <p className="mt-2">Last updated: {new Date(spot.last_updated).toLocaleString()}</p>
        </div>

        {canBook && !activeReservation ? (
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-slate-300">
              Driver Name
              <input
                value={driverName}
                onChange={(event) => setDriverName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
                placeholder="Your full name"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Vehicle Plate *
              <input
                value={vehiclePlate}
                onChange={(event) => setVehiclePlate(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 uppercase"
                placeholder="ABC-1234"
                required
              />
            </label>
            <label className="block text-sm text-slate-300">
              Start Time
              <input
                type="datetime-local"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              />
            </label>
            <label className="block text-sm text-slate-300">
              End Time
              <input
                type="datetime-local"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              />
            </label>
            <p className="text-xs text-slate-500">
              Estimated total: ${estimatedTotal.toFixed(2)} (at $5/hr)
            </p>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

        <div className="mt-6 flex gap-3">
          {activeReservation ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleCancel()}
              className="flex-1 rounded-xl bg-rose-500 px-4 py-3 font-medium text-white hover:bg-rose-400 disabled:opacity-60"
            >
              Cancel Reservation
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || !canBook || !vehiclePlate.trim()}
              onClick={() => void handleBook()}
              className="flex-1 rounded-xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            >
              {canBook ? 'Reserve & Pay' : 'Not Available'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
