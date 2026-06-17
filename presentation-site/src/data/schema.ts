export type SchemaColumn = {
  name: string
  type: string
  constraints: string
}

export type SchemaTable = {
  name: string
  description: string
  columns: SchemaColumn[]
}

export const coreTables: SchemaTable[] = [
  {
    name: 'users',
    description: 'حسابات السائقين والإدارة مع التحكم بالوصول حسب الدور (RBAC).',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY, DEFAULT uuid4()' },
      { name: 'email', type: 'VARCHAR(255)', constraints: 'UNIQUE, NOT NULL, INDEXED' },
      { name: 'password_hash', type: 'VARCHAR(255)', constraints: 'NOT NULL' },
      { name: 'role', type: 'ENUM (user_role)', constraints: 'NOT NULL — DRIVER | MANAGEMENT' },
      { name: 'full_name', type: 'VARCHAR(128)', constraints: 'NULLABLE — الاسم الكامل' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'NOT NULL, DEFAULT now()' },
    ],
  },
  {
    name: 'parking_spots',
    description: 'مخزون المواقف الفعلية مع حالة الإشغال اللحظية لكل منطقة.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY, DEFAULT uuid4()' },
      { name: 'spot_number', type: 'VARCHAR(32)', constraints: 'UNIQUE, NOT NULL, INDEXED' },
      { name: 'level_zone', type: 'VARCHAR(64)', constraints: 'NOT NULL, INDEXED' },
      {
        name: 'status',
        type: 'ENUM (spot_status)',
        constraints: 'NOT NULL — AVAILABLE | RESERVED | OCCUPIED | MAINTENANCE',
      },
      { name: 'last_updated', type: 'TIMESTAMPTZ', constraints: 'NOT NULL, AUTO-UPDATE' },
    ],
  },
  {
    name: 'reservations',
    description: 'سجلات الحجز تربط المستخدمين بالمواقف مع تتبع الدفع ودورة الحياة.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY, DEFAULT uuid4()' },
      {
        name: 'reservation_number',
        type: 'VARCHAR(32)',
        constraints: 'UNIQUE, NOT NULL — صيغة SP-YYYYMMDD-XXXX',
      },
      { name: 'user_id', type: 'UUID', constraints: 'FK → users.id, ON DELETE CASCADE' },
      { name: 'spot_id', type: 'UUID', constraints: 'FK → parking_spots.id, ON DELETE RESTRICT' },
      { name: 'vehicle_plate', type: 'VARCHAR(32)', constraints: 'NULLABLE — رقم اللوحة' },
      { name: 'start_time', type: 'TIMESTAMPTZ', constraints: 'NOT NULL' },
      { name: 'end_time', type: 'TIMESTAMPTZ', constraints: 'NOT NULL' },
      {
        name: 'status',
        type: 'ENUM (reservation_status)',
        constraints: 'NOT NULL — ACTIVE | CANCELLED | EXPIRED | COMPLETED',
      },
      {
        name: 'payment_status',
        type: 'ENUM (payment_status)',
        constraints: 'NOT NULL — PENDING | PAID | FAILED | REFUNDED',
      },
      { name: 'total_price', type: 'NUMERIC(10,2)', constraints: 'NOT NULL, DEFAULT 0.00' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'NOT NULL, DEFAULT now()' },
    ],
  },
  {
    name: 'sensor_logs',
    description: 'سجل تاريخي لقراءات مستشعرات IoT لكل موقف (append-only).',
    columns: [
      { name: 'id', type: 'BIGINT', constraints: 'PRIMARY KEY, AUTO INCREMENT' },
      { name: 'spot_id', type: 'UUID', constraints: 'FK → parking_spots.id, ON DELETE CASCADE' },
      {
        name: 'sensor_state',
        type: 'ENUM (sensor_state)',
        constraints: 'NOT NULL — DETECTED | CLEAR | FAULT',
      },
      { name: 'timestamp', type: 'TIMESTAMPTZ', constraints: 'NOT NULL, INDEXED, DEFAULT now()' },
    ],
  },
]

export const extendedTables = ['malfunction_alerts', 'payment_transactions']

export const extendedTablesNote =
  'جداول إضافية في ترحيل 003: سجل معاملات الدفع وتنبيهات أعطال IoT وفق مخازن البيانات D4–D5 في مخطط DFD.'
