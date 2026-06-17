import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Cloud,
  Cpu,
  Database,
  Globe,
  Radio,
  Server,
  Workflow,
  Zap,
} from 'lucide-react'

const flowSteps = [
  {
    icon: Radio,
    label: 'مستشعر IoT',
    detail: 'DETECTED / CLEAR / FAULT',
    color: 'text-amber-400 bg-amber-500/15',
  },
  {
    icon: Server,
    label: 'FastAPI',
    detail: 'استقبال webhook + تحقق',
    color: 'text-emerald-400 bg-emerald-500/15',
  },
  {
    icon: Zap,
    label: 'Redis Broker',
    detail: 'طابور مهام Celery',
    color: 'text-rose-400 bg-rose-500/15',
  },
  {
    icon: Workflow,
    label: 'Celery Worker',
    detail: 'process_sensor_reading',
    color: 'text-violet-400 bg-violet-500/15',
  },
  {
    icon: Database,
    label: 'PostgreSQL',
    detail: 'سجلات + حالة + تنبيهات',
    color: 'text-blue-400 bg-blue-500/15',
  },
  {
    icon: Cloud,
    label: 'Redis Pub/Sub',
    detail: 'spot_updates + إشعارات',
    color: 'text-rose-300 bg-rose-500/10',
  },
  {
    icon: Cpu,
    label: 'WebSocket',
    detail: 'بث من FastAPI',
    color: 'text-cyan-400 bg-cyan-500/15',
  },
  {
    icon: Globe,
    label: 'واجهة React',
    detail: 'تحديثات لوحة التحكم',
    color: 'text-brand-300 bg-brand-500/15',
  },
]

const layers = [
  {
    title: 'طبقة العرض',
    tech: 'React + TypeScript + Vite',
    items: ['لوحات السائق والإدارة', 'خطاف WebSocket للأحداث الحية', 'طبقة عميل REST API'],
  },
  {
    title: 'طبقة التطبيق',
    tech: 'FastAPI + Pydantic + SQLAlchemy',
    items: ['مصادقة JWT و RBAC', 'منطق الأعمال في طبقة الخدمات', 'مدير اتصالات WebSocket'],
  },
  {
    title: 'المعالجة غير المتزامنة',
    tech: 'Celery + Redis',
    items: ['خط أنابيب قراءات المستشعرات', 'مهام الإيصالات والإشعارات', 'تجميع الإشغال الليلي'],
  },
  {
    title: 'التخزين والرسائل',
    tech: 'PostgreSQL + Redis Pub/Sub',
    items: ['مخازن البيانات D1–D5', 'وسيط الرسائل ونتائج Celery', 'قنوات الأحداث اللحظية'],
  },
]

export function ArchitectureSection() {
  return (
    <section id="architecture" className="section-padding border-t border-white/5 bg-slate-900/30">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 max-w-3xl"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">
            المعمارية التقنية
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">تدفق البيانات من البداية للنهاية</h2>
          <p className="mt-4 text-lg text-slate-400">
            يتبع النظام خط أنابيب موجّهاً بالأحداث: المستشعرات تدفع البيانات بشكل غير متزامن،
            العمال يحفظون وينشرون التغييرات، والعملاء المتصلون يستقبلون التحديثات دون polling.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel overflow-x-auto p-6 md:p-8"
        >
          <div className="flex min-w-[900px] items-center justify-between gap-2">
            {flowSteps.map((step, index) => (
              <div key={step.label} className="flex items-center gap-2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06 }}
                  className="flex flex-col items-center text-center"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${step.color}`}
                  >
                    <step.icon size={22} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-white">{step.label}</p>
                  <p className="mt-0.5 max-w-[100px] text-[10px] leading-tight text-slate-500">
                    {step.detail}
                  </p>
                </motion.div>
                {index < flowSteps.length - 1 && (
                  <ArrowLeft className="shrink-0 text-slate-600" size={16} />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {layers.map((layer, index) => (
            <motion.div
              key={layer.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="glass-panel p-6"
            >
              <h3 className="text-lg font-bold text-white">{layer.title}</h3>
              <p className="mt-1 font-mono text-xs text-brand-300">{layer.tech}</p>
              <ul className="mt-4 space-y-2">
                {layer.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.pre
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950 p-6 font-mono text-xs leading-relaxed text-slate-400 md:text-sm"
        >
{`┌─────────────┐     HTTP/WS      ┌──────────────┐
│   React     │ ◄──────────────► │   FastAPI    │
│   Client    │                  │   REST + WS  │
└─────────────┘                  └──────┬───────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
             ┌────────────┐      ┌────────────┐      ┌────────────┐
             │ PostgreSQL │      │   Redis    │      │   Celery   │
             │  (D1–D5)   │      │ pub/sub +  │      │ worker/beat│
             └────────────┘      │   broker   │      └────────────┘
                                 └────────────┘
                                        ▲
                                        │ X-API-Key webhook
                                 ┌──────┴───────┐
                                 │ IoT Sensors  │
                                 └──────────────┘`}
        </motion.pre>
      </div>
    </section>
  )
}
