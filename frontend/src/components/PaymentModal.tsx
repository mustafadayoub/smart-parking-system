import axios from 'axios'
import { useState } from 'react'

import { processPayment } from '../services/parkingApi'
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

interface PaymentModalProps {
  reservation: Reservation | null
  spotLabel?: string
  onClose: () => void
  onComplete: () => void
}

export function PaymentModal({ reservation, spotLabel, onClose, onComplete }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'WALLET'>('CARD')
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242')
  const [expiry, setExpiry] = useState('12/28')
  const [cvv, setCvv] = useState('123')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!reservation) {
    return null
  }

  async function handlePay() {
    if (paymentMethod === 'WALLET') {
      setError('Wallet payments are not enabled in this demo. Please use Card.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await processPayment({
        reservation_id: reservation!.id,
        card_number: cardNumber,
        expiry,
        cvv,
        payment_method: paymentMethod,
      })

      if (result.payment_status === 'PAID') {
        onComplete()
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Payment could not be processed.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-cyan-500/20 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/40">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-cyan-400">Secure Checkout</p>
            <h2 className="text-2xl font-semibold text-white">Complete Payment</h2>
            {spotLabel ? <p className="mt-1 text-slate-400">{spotLabel}</p> : null}
            <p className="mt-1 text-xs text-violet-300">Ref: {reservation.reservation_number}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            Close
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>Reservation total</span>
            <span className="font-semibold text-white">
              ${Number(reservation.total_price).toFixed(2)}
            </span>
          </div>
          {reservation.vehicle_plate ? (
            <p className="mt-2 text-xs text-slate-500">Plate: {reservation.vehicle_plate}</p>
          ) : null}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod('CARD')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              paymentMethod === 'CARD'
                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                : 'border-slate-700 text-slate-400'
            }`}
          >
            Credit Card
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('WALLET')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              paymentMethod === 'WALLET'
                ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                : 'border-slate-700 text-slate-400'
            }`}
          >
            Wallet (Demo)
          </button>
        </div>

        {paymentMethod === 'CARD' ? (
          <>
            <label className="mt-4 block text-sm text-slate-300">
              Card Number
              <input
                value={cardNumber}
                onChange={(event) => setCardNumber(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono tracking-wider"
              />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <label className="block text-sm text-slate-300">
                Expiry
                <input
                  value={expiry}
                  onChange={(event) => setExpiry(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono"
                />
              </label>
              <label className="block text-sm text-slate-300">
                CVV
                <input
                  value={cvv}
                  onChange={(event) => setCvv(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono"
                />
              </label>
            </div>
          </>
        ) : null}

        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

        <button
          type="button"
          disabled={loading}
          onClick={() => void handlePay()}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-3 font-medium text-slate-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-sky-400 disabled:opacity-60"
        >
          {loading ? 'Processing...' : `Pay $${Number(reservation.total_price).toFixed(2)}`}
        </button>
      </div>
    </div>
  )
}
