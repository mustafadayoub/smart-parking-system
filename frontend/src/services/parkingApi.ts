import { api } from './api'
import type {
  CachedOccupancyReportResponse,
  DailyOccupancyReport,
  FinancialReportResponse,
  MalfunctionAlert,
  ParkingSpot,
  PaymentProcessResponse,
  Reservation,
  ReservationCancelResponse,
  SensorState,
  SpotStatus,
  TokenResponse,
  User,
  UserRole,
} from '../types'

export async function login(email: string, password: string): Promise<TokenResponse> {
  const form = new URLSearchParams()
  form.append('username', email)
  form.append('password', password)

  const { data } = await api.post<TokenResponse>('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

export async function register(
  email: string,
  password: string,
  role: UserRole = 'DRIVER',
  fullName?: string,
): Promise<User> {
  const { data } = await api.post<User>('/auth/register', {
    email,
    password,
    role,
    full_name: fullName,
  })
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me')
  return data
}

export async function fetchUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/users')
  return data
}

export async function updateUser(
  userId: string,
  payload: { full_name?: string; role?: UserRole },
): Promise<User> {
  const { data } = await api.patch<User>(`/users/${userId}`, payload)
  return data
}

export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/users/${userId}`)
}

export async function fetchSpots(params?: {
  status?: SpotStatus
  level_zone?: string
}): Promise<ParkingSpot[]> {
  const { data } = await api.get<ParkingSpot[]>('/spots', { params })
  return data
}

export async function fetchSpot(spotId: string): Promise<ParkingSpot> {
  const { data } = await api.get<ParkingSpot>(`/spots/${spotId}`)
  return data
}

export async function createSpot(payload: {
  spot_number: string
  level_zone: string
  status?: SpotStatus
}): Promise<ParkingSpot> {
  const { data } = await api.post<ParkingSpot>('/spots', payload)
  return data
}

export async function updateSpot(
  spotId: string,
  payload: { status?: SpotStatus; spot_number?: string; level_zone?: string },
): Promise<ParkingSpot> {
  const { data } = await api.patch<ParkingSpot>(`/spots/${spotId}`, payload)
  return data
}

export async function fetchMyReservations(activeOnly = false): Promise<Reservation[]> {
  const { data } = await api.get<Reservation[]>('/reservations/me', {
    params: { active_only: activeOnly },
  })
  return data
}

export async function createReservation(payload: {
  spot_id: string
  start_time: string
  end_time: string
  vehicle_plate: string
}): Promise<Reservation> {
  const { data } = await api.post<Reservation>('/reservations', payload)
  return data
}

export async function cancelReservation(reservationId: string): Promise<ReservationCancelResponse> {
  const { data } = await api.delete<ReservationCancelResponse>(`/reservations/${reservationId}`)
  return data
}

export async function fetchOccupancyReport(reportDate?: string): Promise<DailyOccupancyReport> {
  const { data } = await api.get<DailyOccupancyReport>('/reports/occupancy', {
    params: reportDate ? { report_date: reportDate } : undefined,
  })
  return data
}

export async function fetchCachedOccupancyReport(
  reportDate?: string,
): Promise<CachedOccupancyReportResponse> {
  const { data } = await api.get<CachedOccupancyReportResponse>('/reports/occupancy/cached', {
    params: reportDate ? { report_date: reportDate } : undefined,
  })
  return data
}

export async function fetchFinancialReport(): Promise<FinancialReportResponse> {
  const { data } = await api.get<FinancialReportResponse>('/reports/financial')
  return data
}

export async function processPayment(payload: {
  reservation_id: string
  card_number: string
  expiry: string
  cvv: string
  payment_method?: string
}): Promise<PaymentProcessResponse> {
  const { data } = await api.post<PaymentProcessResponse>('/payments/process', payload)
  return data
}

export async function fetchMalfunctionAlerts(unresolvedOnly = true): Promise<MalfunctionAlert[]> {
  const { data } = await api.get<MalfunctionAlert[]>('/alerts', {
    params: { unresolved_only: unresolvedOnly },
  })
  return data
}

export async function resolveMalfunctionAlert(alertId: string): Promise<MalfunctionAlert> {
  const { data } = await api.patch<MalfunctionAlert>(`/alerts/${alertId}`, { resolved: true })
  return data
}

export async function ingestSensorReading(payload: {
  spot_id: string
  sensor_state: SensorState
}): Promise<{ accepted: boolean; task_id: string; message: string }> {
  const sensorApiKey = import.meta.env.VITE_SENSOR_API_KEY ?? 'dev-sensor-webhook-key'
  const { data } = await api.post('/sensors/ingest', payload, {
    headers: { 'X-API-Key': sensorApiKey },
  })
  return data
}
