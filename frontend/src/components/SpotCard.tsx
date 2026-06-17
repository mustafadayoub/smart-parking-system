import { spotStatusStyles } from '../hooks/useSpotWebSocket'
import type { ParkingSpot } from '../types'

interface SpotCardProps {
  spot: ParkingSpot
  onSelect: (spot: ParkingSpot) => void
}

export function SpotCard({ spot, onSelect }: SpotCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(spot)}
      className={`rounded-2xl border p-4 text-left transition hover:scale-[1.02] hover:shadow-lg ${spotStatusStyles(spot.status)}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">{spot.spot_number}</span>
        <span className="text-xs uppercase tracking-wide">{spot.status}</span>
      </div>
      <p className="mt-2 text-sm opacity-80">{spot.level_zone}</p>
      <p className="mt-3 text-xs opacity-60">
        Updated {new Date(spot.last_updated).toLocaleTimeString()}
      </p>
    </button>
  )
}
