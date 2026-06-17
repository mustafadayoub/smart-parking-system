import type { BookingReceiptPayload, Reservation } from '../types'
import { paymentStatusStyles } from '../hooks/useSpotWebSocket'

interface ReceiptModalProps {
  reservation: Reservation | null
  receipt?: BookingReceiptPayload | null
  onClose: () => void
}

export function ReceiptModal({ reservation, receipt, onClose }: ReceiptModalProps) {
  if (!reservation) {
    return null
  }

  const displaySpot = receipt?.spot_number ?? reservation.spot_number ?? 'Spot'
  const zone = receipt?.level_zone ?? reservation.level_zone
  const paidAt = receipt?.paid_at ?? reservation.created_at

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-violet-400">Booking Receipt</p>
            <h2 className="text-2xl font-semibold text-white">Payment Details</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            Close
          </button>
        </div>

        <div className="mt-5 space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
          <Row label="Reservation #" value={reservation.reservation_number} highlight />
          <Row label="Driver" value={receipt?.driver_name ?? reservation.driver_name ?? 'N/A'} />
          <Row label="Plate" value={receipt?.vehicle_plate ?? reservation.vehicle_plate ?? 'N/A'} />
          <Row label="Spot" value={zone ? `${displaySpot} (${zone})` : displaySpot} />
          <Row label="Start" value={new Date(reservation.start_time).toLocaleString()} />
          <Row label="End" value={new Date(reservation.end_time).toLocaleString()} />
          <Row label="Amount" value={`$${Number(reservation.total_price).toFixed(2)}`} highlight />
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-500">Payment</span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${paymentStatusStyles(reservation.payment_status)}`}
            >
              {reservation.payment_status}
            </span>
          </div>
          <Row label="Paid at" value={new Date(paidAt).toLocaleString()} />
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className={`text-right text-white ${highlight ? 'font-semibold text-emerald-300' : ''}`}>
        {value}
      </span>
    </div>
  )
}
