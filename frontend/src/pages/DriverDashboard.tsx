import { useCallback, useEffect, useMemo, useState } from 'react'

import { BookingModal } from '../components/BookingModal'
import { CancelReservationModal } from '../components/CancelReservationModal'
import { IoTSimulator } from '../components/IoTSimulator'
import { Layout } from '../components/Layout'
import { PaymentModal } from '../components/PaymentModal'
import { ReceiptModal } from '../components/ReceiptModal'
import { SpotCard } from '../components/SpotCard'
import { Toast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { paymentStatusStyles, useSpotWebSocket } from '../hooks/useSpotWebSocket'
import { fetchMyReservations, fetchSpots } from '../services/parkingApi'
import type { BookingReceiptPayload, ParkingSpot, Reservation } from '../types'

export function DriverDashboard() {
  const { user } = useAuth()
  const [initialSpots, setInitialSpots] = useState<ParkingSpot[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null)
  const [checkoutReservation, setCheckoutReservation] = useState<Reservation | null>(null)
  const [cancelReservation, setCancelReservation] = useState<Reservation | null>(null)
  const [receiptReservation, setReceiptReservation] = useState<Reservation | null>(null)
  const [receiptPayload, setReceiptPayload] = useState<BookingReceiptPayload | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const spots = await fetchSpots()
      setInitialSpots(spots)
    } catch {
      setError('Unable to load parking spots. Is the API running on http://localhost:8000 ?')
      setInitialSpots([])
    }

    try {
      const myReservations = await fetchMyReservations()
      setReservations(myReservations)
    } catch {
      setReservations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const {
    spots,
    lastUpdate,
    lastPaymentNotification,
    lastCancellationNotification,
    lastRefundNotification,
    clearPaymentNotification,
    clearCancellationNotification,
    clearRefundNotification,
    connectionLabel,
    isConnected,
  } = useSpotWebSocket(initialSpots, user?.id)

  useEffect(() => {
    if (!lastPaymentNotification) return
    setToastMessage(lastPaymentNotification.message)
    setReceiptPayload(lastPaymentNotification)
    void loadData()
    clearPaymentNotification()
  }, [lastPaymentNotification, clearPaymentNotification, loadData])

  useEffect(() => {
    if (!lastCancellationNotification) return
    setToastMessage(lastCancellationNotification.message)
    void loadData()
    clearCancellationNotification()
  }, [lastCancellationNotification, clearCancellationNotification, loadData])

  useEffect(() => {
    if (!lastRefundNotification) return
    setToastMessage(lastRefundNotification.message)
    void loadData()
    clearRefundNotification()
  }, [lastRefundNotification, clearRefundNotification, loadData])

  const groupedSpots = useMemo(() => {
    return spots.reduce<Record<string, ParkingSpot[]>>((groups, spot) => {
      const key = spot.level_zone
      groups[key] = groups[key] ? [...groups[key], spot] : [spot]
      return groups
    }, {})
  }, [spots])

  const spotById = useMemo(() => new Map(spots.map((spot) => [spot.id, spot])), [spots])

  return (
    <Layout title="Driver Dashboard">
      {toastMessage ? <Toast message={toastMessage} onClose={() => setToastMessage(null)} /> : null}

      <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div>
          <p className="text-sm text-slate-400">Real-time parking grid</p>
          <h2 className="text-lg font-medium text-white">Live spot availability</h2>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span
            className={`rounded-full px-3 py-1 ${isConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}
          >
            WebSocket: {connectionLabel}
          </span>
          {lastUpdate ? (
            <span className="text-slate-400">
              Last event: {lastUpdate.spot_number} → {lastUpdate.status}
            </span>
          ) : null}
        </div>
      </section>

      {loading ? <p className="text-slate-400">Loading spots...</p> : null}
      {error ? <p className="text-rose-400">{error}</p> : null}

      <div className="space-y-8">
        {Object.entries(groupedSpots).map(([zone, zoneSpots]) => (
          <section key={zone}>
            <h3 className="mb-4 text-sm uppercase tracking-[0.2em] text-cyan-400">{zone}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {zoneSpots.map((spot) => (
                <SpotCard key={spot.id} spot={spot} onSelect={setSelectedSpot} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm text-slate-400">Account</p>
        <h2 className="text-xl font-semibold text-white">My Reservations</h2>

        {reservations.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No reservations yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {reservations.map((reservation) => {
              const spot = spotById.get(reservation.spot_id)
              return (
                <div
                  key={reservation.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-white">
                      {reservation.reservation_number} · {spot?.spot_number ?? 'Spot'}
                    </p>
                    <p className="text-sm text-slate-400">
                      {new Date(reservation.start_time).toLocaleString()} →{' '}
                      {new Date(reservation.end_time).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Plate: {reservation.vehicle_plate ?? 'N/A'} · $
                      {Number(reservation.total_price).toFixed(2)} · {reservation.status}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs ${paymentStatusStyles(reservation.payment_status)}`}
                    >
                      {reservation.payment_status}
                    </span>
                    {reservation.payment_status === 'PAID' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptReservation(reservation)
                          setReceiptPayload(null)
                        }}
                        className="rounded-lg border border-violet-500/40 px-3 py-1.5 text-xs text-violet-300 hover:bg-violet-500/10"
                      >
                        View Receipt
                      </button>
                    ) : reservation.payment_status === 'PENDING' && reservation.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        onClick={() => setCheckoutReservation(reservation)}
                        className="rounded-lg border border-cyan-500/40 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/10"
                      >
                        Pay Now
                      </button>
                    ) : null}
                    {reservation.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        onClick={() => setCancelReservation(reservation)}
                        className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <BookingModal
        spot={selectedSpot}
        reservations={reservations}
        onClose={() => setSelectedSpot(null)}
        onChanged={() => void loadData()}
        onBooked={setCheckoutReservation}
      />

      <PaymentModal
        reservation={checkoutReservation}
        spotLabel={
          checkoutReservation
            ? `${spotById.get(checkoutReservation.spot_id)?.spot_number ?? 'Spot'} (${spotById.get(checkoutReservation.spot_id)?.level_zone ?? ''})`
            : undefined
        }
        onClose={() => setCheckoutReservation(null)}
        onComplete={() => {
          setCheckoutReservation(null)
          setToastMessage('Payment successful! Your spot is confirmed.')
          void loadData()
        }}
      />

      <CancelReservationModal
        reservation={cancelReservation}
        onClose={() => setCancelReservation(null)}
        onCancelled={(message) => {
          setToastMessage(message)
          void loadData()
        }}
      />

      <ReceiptModal
        reservation={receiptReservation}
        receipt={receiptPayload}
        onClose={() => {
          setReceiptReservation(null)
          setReceiptPayload(null)
        }}
      />

      <IoTSimulator spots={spots} />
    </Layout>
  )
}
