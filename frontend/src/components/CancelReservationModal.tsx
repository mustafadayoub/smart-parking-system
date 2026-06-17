import axios from 'axios'
import { useState } from 'react'

import { cancelReservation } from '../services/parkingApi'
import type { Reservation } from '../types'

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') {
      return detail
    }
  }
  return fallback
}

interface CancelReservationModalProps {
  reservation: Reservation | null
  onClose: () => void
  onCancelled: (message: string) => void
}

export function CancelReservationModal({
  reservation,
  onClose,
  onCancelled,
}: CancelReservationModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!reservation) {
    return null
  }

  const start = new Date(reservation.start_time)
  const hoursUntilStart = (start.getTime() - Date.now()) / (1000 * 60 * 60)
  const refundEligible = hoursUntilStart >= 1 && reservation.payment_status === 'PAID'

  async function handleConfirm() {
    setLoading(true)
    setError(null)

    try {
      const result = await cancelReservation(reservation!.id)
      onCancelled(result.message)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to cancel reservation'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-white">Cancel Reservation?</h2>
        <p className="mt-2 text-sm text-slate-400">
          Ref: {reservation.reservation_number} · {reservation.spot_number ?? reservation.spot_id}
        </p>

        <div className="mt-4 rounded-xl bg-slate-950 p-4 text-sm text-slate-300">
          <p>
            Refund policy: cancellations at least 1 hour before start may receive a refund for
            paid bookings.
          </p>
          <p className="mt-2 font-medium text-white">
            {refundEligible
              ? 'You are eligible for a refund.'
              : reservation.payment_status === 'PAID'
                ? 'Refund not eligible (less than 1 hour before start).'
                : 'No payment to refund.'}
          </p>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-700 px-4 py-3 text-slate-300"
          >
            Keep Booking
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleConfirm()}
            className="flex-1 rounded-xl bg-rose-500 px-4 py-3 font-medium text-white hover:bg-rose-400 disabled:opacity-60"
          >
            {loading ? 'Cancelling...' : 'Confirm Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
