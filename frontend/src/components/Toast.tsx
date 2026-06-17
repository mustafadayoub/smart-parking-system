import { useEffect } from 'react'

interface ToastProps {
  message: string
  variant?: 'success' | 'error' | 'info'
  onClose: () => void
  durationMs?: number
}

export function Toast({ message, variant = 'success', onClose, durationMs = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, durationMs)
    return () => window.clearTimeout(timer)
  }, [durationMs, onClose])

  const styles =
    variant === 'success'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
      : variant === 'error'
        ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
        : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100'

  return (
    <div className="fixed right-4 top-4 z-[60] max-w-sm animate-[slide-in_0.3s_ease-out]">
      <div className={`rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md ${styles}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium">{message}</p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs opacity-70 transition hover:opacity-100"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
