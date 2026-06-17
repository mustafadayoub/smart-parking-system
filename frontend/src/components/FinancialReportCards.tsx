import type { FinancialReportResponse } from '../types'

function formatCurrency(value: string) {
  return `$${Number(value).toFixed(2)}`
}

function MetricCard({
  title,
  revenue,
  count,
  average,
  accent,
}: {
  title: string
  revenue: string
  count: number
  average: string
  accent: string
}) {
  return (
    <div className={`rounded-2xl border bg-slate-950/80 p-5 ${accent}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-white">{formatCurrency(revenue)}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-500">Paid bookings</p>
          <p className="mt-1 font-medium text-slate-200">{count}</p>
        </div>
        <div>
          <p className="text-slate-500">Avg. transaction</p>
          <p className="mt-1 font-medium text-slate-200">{formatCurrency(average)}</p>
        </div>
      </div>
    </div>
  )
}

export function FinancialReportCards({ report }: { report: FinancialReportResponse | null }) {
  if (!report) {
    return <p className="text-slate-400">Financial report unavailable.</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Generated {new Date(report.generated_at).toLocaleString()}
      </p>
      <div className="grid gap-4">
        <MetricCard
          title="Today"
          revenue={report.today.total_revenue}
          count={report.today.paid_reservations}
          average={report.today.average_transaction_value}
          accent="border-cyan-500/30"
        />
        <MetricCard
          title="This Week"
          revenue={report.this_week.total_revenue}
          count={report.this_week.paid_reservations}
          average={report.this_week.average_transaction_value}
          accent="border-violet-500/30"
        />
        <MetricCard
          title="This Month"
          revenue={report.this_month.total_revenue}
          count={report.this_month.paid_reservations}
          average={report.this_month.average_transaction_value}
          accent="border-emerald-500/30"
        />
      </div>
    </div>
  )
}
