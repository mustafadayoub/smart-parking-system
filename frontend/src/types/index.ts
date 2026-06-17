export type UserRole = 'DRIVER' | 'MANAGEMENT'

export type SpotStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE'

export type ReservationStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

export type SensorState = 'DETECTED' | 'CLEAR' | 'FAULT'

export interface User {
  id: string
  email: string
  role: UserRole
  full_name: string | null
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface ParkingSpot {
  id: string
  spot_number: string
  level_zone: string
  status: SpotStatus
  last_updated: string
}

export interface SpotUpdatePayload {
  spot_id: string
  spot_number: string
  level_zone: string
  status: SpotStatus
  last_updated: string
  source: string
}

export interface Reservation {
  id: string
  reservation_number: string
  user_id: string
  spot_id: string
  vehicle_plate: string | null
  start_time: string
  end_time: string
  status: ReservationStatus
  payment_status: PaymentStatus
  total_price: string
  created_at: string
  driver_name?: string | null
  spot_number?: string | null
  level_zone?: string | null
}

export interface ReservationCancelResponse {
  reservation: Reservation
  message: string
  refund_eligible: boolean
  refund_processed: boolean
  notification_queued: boolean
}

export interface HourlyOccupancyBucket {
  hour: number
  detected_readings: number
  clear_readings: number
  utilization_rate: number
}

export interface DailyOccupancyReport {
  report_date: string
  total_spots: number
  peak_hour: number | null
  peak_utilization_rate: number
  average_utilization_rate: number
  hourly_breakdown: HourlyOccupancyBucket[]
  generated_at: string
}

export interface CachedOccupancyReportResponse {
  report: DailyOccupancyReport
  cache_key: string
  source: string
}

export interface FinancialPeriodMetrics {
  total_revenue: string
  paid_reservations: number
  average_transaction_value: string
}

export interface FinancialReportResponse {
  today: FinancialPeriodMetrics
  this_week: FinancialPeriodMetrics
  this_month: FinancialPeriodMetrics
  generated_at: string
}

export interface PaymentProcessResponse {
  reservation_id: string
  payment_status: PaymentStatus
  total_price: string
  message: string
  receipt_queued: boolean
  gateway_reference?: string | null
}

export interface MalfunctionAlert {
  id: string
  spot_id: string
  message: string
  device_id: string | null
  resolved: boolean
  created_at: string
  spot_number?: string | null
  level_zone?: string | null
}

export interface BookingReceiptPayload {
  event_type: 'PAYMENT_SUCCESS'
  user_id: string
  reservation_id: string
  reservation_number: string
  spot_number: string
  level_zone: string
  vehicle_plate?: string | null
  driver_name?: string | null
  start_time: string
  end_time: string
  total_price: string
  payment_status: PaymentStatus
  message: string
  paid_at: string
}

export interface CancellationNotificationPayload {
  event_type: 'CANCELLATION_SUCCESS'
  user_id: string
  reservation_id: string
  reservation_number: string
  spot_number: string
  refund_eligible: boolean
  refund_processed: boolean
  message: string
  cancelled_at: string
}

export interface RefundNotificationPayload {
  event_type: 'REFUND_SUCCESS'
  user_id: string
  reservation_id: string
  reservation_number: string
  refund_amount: string
  gateway_reference: string
  message: string
  refunded_at: string
}

export interface MalfunctionAlertPayload {
  event_type: 'MALFUNCTION_ALERT'
  alert_id: string
  spot_id: string
  spot_number: string
  level_zone: string
  message: string
  device_id?: string | null
  created_at: string
}

export type DriverNotificationPayload =
  | BookingReceiptPayload
  | CancellationNotificationPayload
  | RefundNotificationPayload

export type WebSocketEventPayload =
  | SpotUpdatePayload
  | DriverNotificationPayload
  | MalfunctionAlertPayload
